const http = require('http');

const server = http.createServer((req, res) => {
  res.end('Hola desde Node.js');
});

server.listen(3000, () => {
  console.log('Servidor funcionando en http://localhost:3000');
});
