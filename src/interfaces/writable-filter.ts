import ClassicFilter from './classic-filter'

/**
 * A WritableFilter extends the {@link ClassicFilter} with the ability to remove elements from the filter.
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export default interface WritableFilter<T> extends ClassicFilter<T> {
    /**
     * Remove an element from the filter
     * @param element - The element to remove
     * @return True if the element has been removed from the filter, False otherwise
     */
    remove(element: T): boolean
}
