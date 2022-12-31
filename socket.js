const SocketIO = require('socket.io');

module.exports = (server, app) => {
    // `server` 와 연결
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io);
    io.on('connection', (socket) => { // 웹 소켓 연결 시
        const req = socket.request;
        const { headers: { referer } } = req;
        // roomId 경매방.
        const roomId = new URL(referer).pathname.split('/').at(-1);
        socket.join(roomId);
        socket.on('disconnect', () => {
            socket.leave(roomId);
        });
    });
};