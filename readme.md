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
## 도메인 구조
```
User --*> Auction --> Good
```

## ERD
```
User -< Auction >- Good
```