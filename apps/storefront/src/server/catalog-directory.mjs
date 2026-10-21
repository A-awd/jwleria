/**
 * The curated public directory already identifies known brands. Query published
 * additions only when necessary, rather than making every product card wait.
 * @template {{slug: string}} T
 * @param {string} slug
 * @param {T[]} directory
 * @param {() => Promise<T[]>} loadPublishedDirectory
 * @returns {Promise<T | undefined>}
 */
export async function findDirectoryBrand(slug, directory, loadPublishedDirectory) {
  const known = directory.find(brand => brand.slug === slug);
  return known ?? (await loadPublishedDirectory()).find(brand => brand.slug === slug);
}
