## 공부 주제
* 서버 시간 사용하기 (sse)
* 웹소켓 통신 (socket.io)

### SSE - 클라이언트에서 서버 시간 받기
* sse
  * 개발자 도구에 `EventStream` 탭 확인

## 노드 스케줄러
```
npm i node-schedule
```

* node-schedule 에 단점은 node 서버가 종료 되면 스케줄링이 같이 죽는다.
  * 등록했던 job 데이터 이 사라지기 때문에... 서버 복구 후에도 스케줄링 데이터가 없음. 회복을 하지 못함.
* 회복이 되지 않기 때문에 회복을 위한 코드를 작성해야 한다.

## 트랜잭션 적용하기
낙찰자를 정하고 낙찰 금액을 차감하는 코드를 다시 한 번 봅시다.

```javascript
const success = await Auction.findOne({
  where: { GoodId: good.id },
  order: [['bid', 'DESC']],
});
await good.setSold(success.UserId);
// 여기까지 성공
// 실패
await User.update({
  money: sequelize.literal(`money - ${success.bid}`),
}, {
    where: { id: success.UserId },
});
```

만약 setSold DB 작업은 성공했는데. update DB 작업은 어떠한 이유에서든 실패했다면 어떻게 될까요?  
낙찰자는 정해졌는데 낙찰 금액은 차감되지 않을 것입니다. 이런 경우 심각한 문제가 될 수 있습니다.

이 경우를 대비해서  DB 는 트랜잭션라는 기능을 지원합니다. 지정한 DB 작업들이 모두 성공해야만 넘어가고 하나라도  
실패하면 모든 다 원래 상태로 되돌리는 기능입니다.  

시퀄라이즈도 트랜잭션을 위한 코드를 제공합니다. 한 번 적용해보겠습니다.

```javascript
const t = await sequelize.transaction();
try {
    const success = await Auction.findOne({
      where: { GoodId: good.id },
      order: [['bid'], ['DESC']],
      transaction: t,
    })
    await good.setSold(success.UserId, {transaction: t});
    await User.update({
        money: sequelize.literal(`money - ${success.bid}`),
    }, {
        where: { id: success.UserId },
        transaction: t,
    }) ;
    await t.commit();
} catch (error) {
    t.rollback();
}
```
`sequelize.transaction()` 으로 트랜잭션을 생성하고, 대상이 될 DB 작업의 옵션으로 생성한 트랜잭션을
적용합니다. 위 코드에서는 `findOne, setSold, update` 에 하나의 트랜잭션을 적용했습니다. 세 DB 작업중
하나라도 실패하면 `catch` 문으로 이동하게 되고, `t.rollback()` 에서 전부 실패한 것으로 처리되어 원래 상태로 되돌아갑니다.
`update` 에서만 실패했더라도 `setSold` 에서 낙찰자를 지정한 것까지 원래 상태로 돌아가는 것입니다. 전부
성공했다면 `t.commit()` 에 의해 DB 에 반영됩니다.

시퀄라이즈의 `transaction` 속성은 READ, DELETED 작업에서는 첫 번째 인수 객체에 존재하고, CREATE, UPDATE 작업에서는
두 번째 인수 객체에 존재합니다. 앞으로도 반드시 모구 성공해야 하는 DB 잡업이 있다면 동일한 트랜잭션으로 묶어주세요.

## 도메인 구조
```
User --*> Auction --> Good
```

## ERD
```
User -< Auction >- Good
```