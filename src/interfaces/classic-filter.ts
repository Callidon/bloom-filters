/**
 * A classic probabilistic data-structure, which supports insertions of elements and membership queries.
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default interface ClassicFilter<T> {
  /**
   * Add an element to the filter
   * @param element - The element to add
   */
  add(element: T): void

  /**
   * Test an element for membership
   * @param element - The element to look for in the filter
   * @return False if the element is definitively not in the filter, True is the element might be in the filter
   */
  has(element: T): boolean
}
