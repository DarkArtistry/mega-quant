// MEGA QUANT Strategy Worker
// This worker executes trading strategies in isolation from the main thread

// Store interval/timeout IDs for cleanup
const timers = new Set();

// Override setInterval to track timers
const originalSetInterval = self.setInterval;
self.setInterval = function(...args) {
  const id = originalSetInterval.apply(self, args);
  timers.add(id);
  return id;
};

// Override setTimeout to track timers
const originalSetTimeout = self.setTimeout;
self.setTimeout = function(...args) {
  const id = originalSetTimeout.apply(self, args);
  timers.add(id);
  return id;
};

// Override clearInterval to untrack timers
const originalClearInterval = self.clearInterval;
self.clearInterval = function(id) {
  timers.delete(id);
  return originalClearInterval.call(self, id);
};

// Override clearTimeout to untrack timers
const originalClearTimeout = self.clearTimeout;
self.clearTimeout = function(id) {
  timers.delete(id);
  return originalClearTimeout.call(self, id);
};

// Custom console that sends logs back to main thread
const console = {
  log: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'log',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  error: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'error',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  warn: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'warn',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  },
  info: (...args) => {
    self.postMessage({
      type: 'log',
      level: 'info',
      message: args.map(a => String(a)).join(' '),
      timestamp: Date.now()
    });
  }
};

// Handle messages from main thread
self.onmessage = async function(e) {
  const { type, code } = e.data;

  if (type === 'execute') {
    try {
      // Send initial log
      console.info('🔍 Validating code...');

      // Validate syntax
      new Function(code);
      console.log('✅ Code validation successful!');
      console.info('▶️ Running strategy...');
      console.info('─'.repeat(50));

      // Execute the code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
      const executor = new AsyncFunction('console', code);
      await executor(console);

      console.info('─'.repeat(50));
      console.log('✅ Strategy execution completed successfully!');

      self.postMessage({ type: 'completed' });
    } catch (error) {
      console.info('─'.repeat(50));
      console.error(`❌ Runtime error: ${error.message}`);
      console.warn('Check your strategy code and try again.');
      self.postMessage({ type: 'error', error: error.message });
    }
  } else if (type === 'stop') {
    // Clear all timers
    console.warn('⏹️ Stopping strategy...');
    timers.forEach(id => {
      originalClearInterval(id);
      originalClearTimeout(id);
    });
    timers.clear();
    console.info('Strategy stopped.');
    self.postMessage({ type: 'stopped' });
  }
};
