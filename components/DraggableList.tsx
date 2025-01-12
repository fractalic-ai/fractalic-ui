import React, { useState } from 'react';

interface DraggableListProps {
  items: any[];
  onReorder: (items: any[]) => void;
  renderItem: (item: any, props: { isDragging: boolean; dragHandleProps: any }) => React.ReactNode;
}

const DraggableList: React.FC<DraggableListProps> = ({ items, onReorder, renderItem }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newItems = [...items];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(dragOverIndex, 0, draggedItem);
      onReorder(newItems);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientY < rect.top ||
      e.clientY >= rect.bottom ||
      e.clientX < rect.left ||
      e.clientX >= rect.right
    ) {
      setDragOverIndex(null);
    }
  };

  return (
    <div 
      className="space-y-2"
      onDragLeave={handleDragLeave}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(index, e)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className="relative"
        >
          {/* Drag indicator overlay */}
          {dragOverIndex === index && (
            <div
              className="absolute left-0 right-0 h-[3px] bg-primary z-[9999] pointer-events-none"
              style={{
                top: draggedIndex !== null && draggedIndex > index ? '-1.5px' : 'auto',
                bottom: draggedIndex !== null && draggedIndex < index ? '-1.5px' : 'auto',
                boxShadow: '0 0 4px rgba(0,0,0,0.2)',
                marginLeft: '-2px',
                marginRight: '-2px'
              }}
            />
          )}
          {renderItem(item, {
            isDragging: draggedIndex === index,
            dragHandleProps: {
              onMouseDown: (e: React.MouseEvent) => {
                e.currentTarget.closest('[draggable="true"]')?.setAttribute('draggable', 'true');
              },
              onMouseUp: (e: React.MouseEvent) => {
                e.currentTarget.closest('[draggable="true"]')?.setAttribute('draggable', 'false');
              }
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default DraggableList;