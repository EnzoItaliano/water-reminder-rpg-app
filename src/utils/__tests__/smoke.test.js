describe('test harness', () => {
  it('runs ES module test files', () => {
    const double = (n) => n * 2;
    expect(double(21)).toBe(42);
  });
});
