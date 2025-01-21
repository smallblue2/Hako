self.onmessage = (e) => {
  const stdin = e.data.stdin;
  const stdout = e.data.stdout;
  stdin.onmessage = (e) => {
    stdout.postMessage(fib(parseInt(e.data)))
  }
 }

let fib = (num) => {
  const memo = {};

  let helper = (n) => {
    if (n <= 0) return 0;
    if (n === 1 || n === 2) return 1;
    if (n in memo) return memo[n];
    return (memo[n] = helper(n - 1) + helper(n - 2));
  }

  return helper(num);
}
