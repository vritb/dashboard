/**
 * DOM Utility Functions
 *
 * This module provides utility functions for DOM manipulation.
 */

/**
 * Create an element with attributes and children
 * @param {string} tag - Element tag name
 * @param {Object} [attrs={}] - Element attributes
 * @param {Array|Node|string} [children] - Child elements or text
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, attrs = {}, children) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      // Handle style object
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else if (key === 'className') {
      // Handle className
      element.className = value;
    } else if (key === 'dataset') {
      // Handle dataset
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Handle event listeners
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      // Handle regular attributes
      element.setAttribute(key, value);
    }
  });

  // Add children
  if (children !== undefined) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (child !== null && child !== undefined) {
          appendChild(element, child);
        }
      });
    } else {
      appendChild(element, children);
    }
  }

  return element;
}

/**
 * Append a child to an element
 * @param {HTMLElement} parent - Parent element
 * @param {Node|string} child - Child element or text
 */
export function appendChild(parent, child) {
  if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(child));
  } else {
    parent.appendChild(child);
  }
}

/**
 * Remove all children from an element
 * @param {HTMLElement} element - Element to clear
 */
export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Create an SVG element with attributes and children
 * @param {string} tag - SVG element tag name
 * @param {Object} [attrs={}] - Element attributes
 * @param {Array|Node|string} [children] - Child elements or text
 * @returns {SVGElement} The created SVG element
 */
export function createSvgElement(tag, attrs = {}, children) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  // Add children
  if (children !== undefined) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (child !== null && child !== undefined) {
          appendSvgChild(element, child);
        }
      });
    } else {
      appendSvgChild(element, children);
    }
  }

  return element;
}

/**
 * Append a child to an SVG element
 * @param {SVGElement} parent - Parent SVG element
 * @param {Node|string} child - Child element or text
 */
export function appendSvgChild(parent, child) {
  if (typeof child === 'string' || typeof child === 'number') {
    parent.appendChild(document.createTextNode(child));
  } else {
    parent.appendChild(child);
  }
}

/**
 * Add a CSS stylesheet to the document
 * @param {string} css - CSS content
 * @returns {HTMLStyleElement} The created style element
 */
export function addStylesheet(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Create a throttled function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Throttle limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let lastCall;
  let lastCallTimer;
  return function (...args) {
    const context = this;
    const now = Date.now();
    if (!lastCall || now - lastCall >= limit) {
      lastCall = now;
      return func.apply(context, args);
    }
    clearTimeout(lastCallTimer);
    lastCallTimer = setTimeout(() => {
      lastCall = now;
      func.apply(context, args);
    }, limit);
  };
}

/**
 * Get element dimensions
 * @param {HTMLElement} element - Element to measure
 * @returns {Object} Element dimensions
 */
export function getElementDimensions(element) {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    bottom: rect.bottom,
    right: rect.right
  };
}
