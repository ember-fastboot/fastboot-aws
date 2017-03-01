'use strict';

function forceHttpsMiddleware(req, res, next) {
  // Skip redirect if header indicates edge server received request over HTTPS or request is ELB health check
  if (req.headers['x-forwarded-proto'] === 'https' || req.headers['user-agent'].indexOf('HealthChecker') >= 0) {
    return next();
  } else {
    // Otherwise redirect!
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
};

module.exports = forceHttpsMiddleware;