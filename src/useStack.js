import { useState, useRef, useCallback } from 'react';

function useStack() {
  // State to trigger re-renders whenever stack changes
  const [_, setTrigger] = useState(false);

  // Ref to hold the actual stack data across renders without causing re-renders
  const stackRef = useRef([]);

  // Push function to add an item to the top of the stack
  const push = useCallback((item) => {
    stackRef.current.push(item); // Add item to the top
    setTrigger(prev => !prev);   // Toggle state to force re-render
  }, []);

  // Pop function to remove the item from the top of the stack
  const pop = useCallback(() => {
    if (stackRef.current.length > 0) {
      const removedItem = stackRef.current.pop(); // Remove item from the top
      setTrigger(prev => !prev);                  // Toggle state to force re-render
      return removedItem;
    }
    return null; // Return null if stack is empty
  }, []);

  // Peek function to view the top item without removing it
  const peek = useCallback(() => {
    return stackRef.current.length > 0 ? stackRef.current[stackRef.current.length - 1] : null;
  }, []);

  // Function to get the current state of the stack
  const getStack = useCallback(() => [...stackRef.current], []);

  // Optionally, clear the stack
  const clearStack = useCallback(() => {
    stackRef.current = [];
    setTrigger(prev => !prev); // Toggle state to force re-render
  }, []);

  return { push, pop, peek, getStack, clearStack };
}

export default useStack;
