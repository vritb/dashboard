/**
 * Base Component Tests
 */

import Component from '../../components/base-component.js';

// Mock DOM element for testing
function createMockElement() {
  return document.createElement('div');
}

describe('Component', () => {
  let container;
  let component;

  beforeEach(() => {
    // Set up a fresh container element before each test
    container = createMockElement();
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up after each test
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    component = null;
    container = null;
  });

  test('should throw error when initialized without container', () => {
    expect(() => {
      new Component();
    }).toThrow('Component requires a container element');
  });

  test('should initialize with container element', () => {
    component = new Component(container);
    expect(component.container).toBe(container);
    expect(component.initialized).toBe(false);

    // Initialize the component
    component.initialize();
    expect(component.initialized).toBe(true);
  });

  test('should initialize only once', () => {
    component = new Component(container);

    // Initialize the component
    component.initialize();
    expect(component.initialized).toBe(true);

    // Try to initialize again
    const result = component.initialize();
    expect(component.initialized).toBe(true);
    expect(result).toBe(component); // Should return this for chaining
  });

  test('should handle options in constructor', () => {
    const options = {
      testOption: 'test',
      color: 'blue'
    };

    component = new Component(container, options);
    expect(component.options).toEqual(options);
  });

  test('should update options when update is called', () => {
    component = new Component(container, { color: 'blue' });
    component.initialize();

    // Update with new options
    component.update({}, { color: 'red', newOption: 'value' });

    expect(component.options).toEqual({
      color: 'red',
      newOption: 'value'
    });
  });

  test('should manage state correctly', () => {
    component = new Component(container);
    component.initialize();

    // Initial state should be empty
    expect(component.getState()).toEqual({});

    // Set state
    component.setState({ count: 1 });
    expect(component.getState()).toEqual({ count: 1 });

    // Set state again - should merge
    component.setState({ total: 10 });
    expect(component.getState()).toEqual({
      count: 1,
      total: 10
    });

    // Override existing state
    component.setState({ count: 5 });
    expect(component.getState()).toEqual({
      count: 5,
      total: 10
    });
  });

  test('should clean up properly when destroyed', () => {
    component = new Component(container);
    component.initialize();

    // Add some content to the container
    container.innerHTML = '<p>Test content</p>';
    component.elements = {
      paragraph: container.querySelector('p')
    };

    // Destroy the component
    component.destroy();

    expect(container.innerHTML).toBe('');
    expect(component.elements).toEqual({});
    expect(component.initialized).toBe(false);
  });
});
