const dns = require('dns');

async function resolveViaDoH(hostname) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
    const data = await res.json();
    if (data.Answer && data.Answer.length > 0) {
      // Find the first A record (type 1)
      const aRecord = data.Answer.find(a => a.type === 1);
      if (aRecord) {
        return aRecord.data;
      }
    }
  } catch (e) {
    console.error(`DoH lookup failed for ${hostname}:`, e.message);
  }
  return null;
}

// Override the default dns.lookup
const originalLookup = dns.lookup;

dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  // Use original for localhost or internal
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return originalLookup(hostname, options, callback);
  }

  resolveViaDoH(hostname).then(ip => {
    if (ip) {
      callback(null, ip, 4);
    } else {
      // Fallback to original
      originalLookup(hostname, options, callback);
    }
  }).catch(err => {
    originalLookup(hostname, options, callback);
  });
};

console.log('Custom DNS resolver initialized (using dns.google DoH)');
