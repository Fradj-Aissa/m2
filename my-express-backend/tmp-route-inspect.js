const express = require('express');
const app = express();
const admin = require('./routes/admin');
app.use('/api/admin', admin);
function printStack(prefix, stack) {
  stack.forEach((m) => {
    if (m.route) {
      console.log(prefix + m.route.path + ' [' + Object.keys(m.route.methods).join(',') + ']');
    } else if (m.name === 'router' && m.handle && m.handle.stack) {
      console.log(prefix + '<router>');
      printStack(prefix + '  ', m.handle.stack);
    }
  });
}
printStack('', app._router.stack);
