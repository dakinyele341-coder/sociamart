/** Join truthy class names. Tiny clsx replacement. */
export function cn(...args) {
  return args
    .flat(Infinity)
    .filter(Boolean)
    .join(' ')
    .trim()
}
