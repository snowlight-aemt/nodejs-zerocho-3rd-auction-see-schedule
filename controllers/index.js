const { Op } = require('sequelize');
const { Good, Auction, User, sequelize } = require('../models');
const schedule = require('node-schedule');

exports.renderMain = async (req, res, next) => {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // 어제 시간
        const goods = await Good.findAll({
            where: { SoldId: null, createdAt: { [Op.gte]: yesterday } },
        });
        res.render('main', {
            title: 'NodeAuction',
            goods,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.renderJoin = (req, res) => {
    res.render('join', {
        title: '회원가입 - NodeAuction',
    });
};

exports.renderGood = (req, res) => {
    res.render('good', { title: '상품 등록 - NodeAuction' });
};

exports.createGood = async (req, res, next) => {
    try {
        const { name, price } = req.body;
        const good = await Good.create({
            OwnerId: req.user.id,
            name,
            img: req.file.filename,
            price,
        });
        const end = new Date();
        end.setDate(end.getDate() + 1);
        // node-schedule 에 단점은 node 서버가 종료 되면 스케줄링이 같이 죽는다.
        const job = schedule.scheduledJobs(end, async () => {
            const auction = await Auction.findOne({
                where: { GoodId: good.id },
                order: [['bid', 'DESC']],
                limit: 1,
            });
            await good.setSold(auction.UserId);
            await User.update({
                money: sequelize.literal(`money - ${auction.bid}`)
                // SET money = money - 1000000
            }, {
                where: { id: auction.UserId }
            })
        });
        job.on('error', console.error);
        job.on('success', () => {
            console.log(`${good.id} 스케줄링 성공.`);
        })
        res.redirect('/');
    } catch (error) {
        console.error(error);
        next(error);
    }
};

exports.renderAuction = async (req, res, next) => {
    try {
        const [good, auction] = await Promise.all([
            Good.findOne({
                where: { id: req.params.id },
                include: {
                    model: User,
                    as: 'Owner',
                    attributes: ['nick']
                }
            }),
            Auction.findAll({
                where: { GoodId: req.params.id },
                include: { model: User },
                order: [['bid', 'ASC']]
            })
        ]);
        res.render('auction', {
            title: `${good.name} - NodeAuction`,
            good,
            auction,
        })
    } catch (error) {
        console.error(error);
        next(error);
    }
}

// TODO 비지니스가 존재한다. `service` 로 이동이 필요함.
exports.bid = async (req, res, next) => {
    const { bid, msg } = req.body;
    try {
        // `include` 에 model 에 순서를 기준으로 정렬.
        const good = await Good.findOne({
            where: { id: req.params.id },
            include: { model: Auction },
            order: [[{ model: Auction }, 'bid', 'DESC']]
        });

        if (!good) {
            return res.status(404).send('해당 상품은 존재하지 않습니다.');
        }
        if (good.price >= bid) {
            return res.status(403).send('시작 가격보다 높게 입찰해야 합니다.')
        }
        if (new Date(good.createdAt).valueOf() + (24 * 60 * 60 * 1000) < new Date()) {
            return res.status(403).send('경매가 이미 종료되었습니다.');
        }
        if (good.Auctions[0]?.bid >= bid) {
            return res.status(403).send('이전 입찰가보다 높아야 합니다.');
        }

        const result = await Auction.create({
            bid,
            msg,
            UserId: req.user.id,
            GoodId: req.params.id,
        });

        res.app.get('io').to(req.params.id).emit('bid', {
            bid: result.bid,
            msg: result.msg,
            nick: req.user.nick,
        });
        return res.send('ok');
    } catch (error) {
        console.error(error);
        next(error);
    }
}