const SSE = require('sse');

module.exports = (server) => {
    // `server` 와 연결
    const sse = new SSE(server);
    sse.on('connection', (client) => {
        //서버 시간을 클라이언트로 전송.
        setInterval(() => {
          client.send(Date.now().toString());
        }, 1000);
    });
}