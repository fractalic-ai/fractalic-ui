import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { operationSchema } from '../config/operationSchema';

interface OperationComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

const OperationCombobox: React.FC<OperationComboboxProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, width: 0, direction: 'down' });
  const options = Object.keys(operationSchema).map(key => `@${key}`);

  // Track direct parent node for scroll sync
  const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
    if (!node) return null;

    const isScrollable = (element: HTMLElement) => {
      const overflowY = window.getComputedStyle(element).overflowY;
      return overflowY !== 'visible' && overflowY !== 'hidden';
    };

    if (isScrollable(node)) return node;
    return getScrollParent(node.parentElement);
  };

  const updatePosition = () => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const direction = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove ? 'down' : 'up';

    setPosition({
      left: rect.left,
      width: rect.width,
      direction
    });

    if (dropdownRef.current) {
      const top = direction === 'down' ? rect.bottom : rect.top - dropdownHeight;
      dropdownRef.current.style.position = 'fixed';
      dropdownRef.current.style.top = `${top}px`;
      dropdownRef.current.style.left = `${rect.left}px`;
      dropdownRef.current.style.width = `${rect.width}px`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      
      // Find scrollable parent and attach scroll listener
      const scrollParent = getScrollParent(triggerRef.current);
      const handleScroll = () => {
        requestAnimationFrame(updatePosition);
      };

      if (scrollParent) {
        scrollParent.addEventListener('scroll', handleScroll, { passive: true });
      }
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', updatePosition);

      return () => {
        if (scrollParent) {
          scrollParent.removeEventListener('scroll', handleScroll);
        }
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div ref={triggerRef} className="relative w-32">
        <div 
          className="flex items-center justify-between w-full px-2 py-1 text-gray-200 bg-transparent border border-gray-700 rounded cursor-pointer hover:border-gray-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="text-lg">{value || options[0]}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-[99999]"
          style={{
            transformOrigin: position.direction === 'up' ? 'bottom' : 'top',
          }}
        >
          {options.map((option) => (
            <div
              key={option}
              className={`px-2 py-1 text-lg cursor-pointer hover:bg-gray-700 ${value === option ? 'bg-gray-700' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default OperationCombobox;