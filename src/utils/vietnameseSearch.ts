/** Bỏ dấu tiếng Việt, chữ thường — để so khớp tìm kiếm không phân biệt dấu/hoa thường. */
export const normalizeVi = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** true nếu query khớp bất kỳ trường nào (đã bỏ dấu). Query rỗng luôn khớp. */
export const matchesSearch = (
  query: string,
  ...fields: (string | null | undefined)[]
): boolean => {
  const q = normalizeVi(query);
  if (!q) return true;
  return fields.some((f) => f && normalizeVi(f).includes(q));
};
