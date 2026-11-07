export function passwordError(value: string): string {
  if (value.length < 12 || value.length > 64) return '密码需要 12–64 个字符';
  return new TextEncoder().encode(value).length > 72
    ? '密码的 UTF-8 编码不能超过 72 字节，请缩短中文或表情密码'
    : '';
}
