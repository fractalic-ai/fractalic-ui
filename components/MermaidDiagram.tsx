import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize, Download, Move } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  isDarkMode: boolean;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isDarkMode }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.random().toString(36).substring(2)}`);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Set pan mode to true by default
  const [isPanMode, setIsPanMode] = useState(true);
  
  // Store the rendered diagram to prevent re-rendering on zoom/pan
  const renderedDiagramRef = useRef<string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle mouse events for panning
  useEffect(() => {
    if (!containerRef.current || !isPanMode) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      e.preventDefault(); // Prevent text selection when dragging
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
    };

    // Use the container ref instead of element ref for dragging
    const container = containerRef.current;
    
    if (isPanMode && container) {
      container.style.cursor = 'grab';
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.style.cursor = 'default';
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanMode, isDragging, dragStart]);

  // Initialize and render mermaid diagram
  useEffect(() => {
    // Define custom theme for mermaid
    const theme = {
      background: 'transparent', 
      primaryColor: '#adbac7',
      secondaryColor: '#768390',
      tertiaryColor: '#636e7b',
      primaryBorderColor: '#444c56',
      secondaryBorderColor: '#373e47',
      lineColor: '#768390',
      textColor: '#adbac7',
      mainBkg: 'transparent',
      nodeBkg: '#2d333b',
      nodeTextColor: '#adbac7',
      edgeLabelBackground: 'transparent',
      clusterBkg: '#2d333b',
      titleColor: '#adbac7',
      actorBorder: '#444c56',
      actorBkg: '#2d333b',
      actorTextColor: '#adbac7',
      actorLineColor: '#768390',
      signalColor: '#768390',
      signalTextColor: '#adbac7',
      labelBoxBkgColor: '#2d333b',
      labelBoxBorderColor: '#444c56',
      labelTextColor: '#adbac7',
      loopTextColor: '#adbac7',
      noteBorderColor: '#444c56',
      noteBkgColor: '#2d333b',
      noteTextColor: '#adbac7',
      activationBorderColor: '#444c56',
      activationBkgColor: '#2d333b',
      sequenceNumberColor: '#adbac7',
      sectionBkgColor: '#2d333b',
      altSectionBkgColor: 'transparent',
      sectionBkgColor2: '#2d333b',
      excludeBkgColor: '#2d333b',
      taskBorderColor: '#444c56',
      taskBkgColor: '#2d333b',
      taskTextColor: '#adbac7',
      taskTextLightColor: '#adbac7',
      taskTextOutsideColor: '#adbac7',
      activeTaskBorderColor: '#768390',
      activeTaskBkgColor: '#2d333b',
      gridColor: '#444c56',
      doneTaskBkgColor: '#2d333b',
      doneTaskBorderColor: '#444c56',
      critBorderColor: '#f85149',
      critBkgColor: '#2d333b',
      todayLineColor: '#f85149',
      personBorder: '#444c56',
      personBkg: '#2d333b',
    };

    // Only render the diagram if it hasn't been rendered yet or if the chart has changed
    if (renderedDiagramRef.current !== chart) {
      const initializeMermaid = async () => {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: theme,
            securityLevel: 'loose',
            fontFamily: 'inherit',
            flowchart: {
              curve: 'basis',
              padding: 5, // Reduced padding
              useMaxWidth: true, // Enable max width
              htmlLabels: true,
            },
            sequence: {
              actorMargin: 50,
              messageMargin: 40,
              mirrorActors: false,
              useMaxWidth: true, // Enable max width
            },
            gantt: {
              leftPadding: 75,
              useMaxWidth: true, // Enable max width
            }
          });

          if (elementRef.current) {
            // Clear previous content
            elementRef.current.innerHTML = '';
            
            // Create a new div for the mermaid diagram
            const mermaidDiv = document.createElement('div');
            mermaidDiv.id = chartId.current;
            mermaidDiv.className = 'mermaid';
            mermaidDiv.textContent = chart;
            mermaidDiv.style.backgroundColor = 'transparent';
            elementRef.current.appendChild(mermaidDiv);
            
            // Render the mermaid diagram
            await mermaid.run({
              nodes: [mermaidDiv]
            });

            // Get the SVG element and adjust it
            const svgElement = elementRef.current.querySelector('svg');
            if (svgElement) {
              // Adjust the SVG styling
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.minHeight = '200px';
              svgElement.style.display = 'block'; // Prevent inline display issues
              svgElement.style.overflow = 'visible'; // Prevent clipping
              svgElement.style.backgroundColor = 'transparent';
              
              // More aggressive approach to remove backgrounds
              const allRects = svgElement.querySelectorAll('rect');
              allRects.forEach(rect => {
                const fill = rect.getAttribute('fill');
                // If it's a background rect (based on size or position)
                if (rect.getAttribute('width') === '100%' || 
                    rect.getAttribute('width') === svgElement.getAttribute('width') ||
                    rect.getAttribute('height') === svgElement.getAttribute('height') ||
                    !rect.getAttribute('class') || // Background rects usually don't have classes
                    rect.getAttribute('x') === '0' && rect.getAttribute('y') === '0' ||
                    fill === '#0F172A' || fill === '#2d333b' || fill === '#1e293b' ||
                    fill && fill.toLowerCase().includes('bg')
                ) {
                    rect.setAttribute('fill', 'transparent');
                    rect.setAttribute('fill-opacity', '0');
                }
              });
              
              // Fix background color for foreignObjects (HTML labels)
              const foreignObjects = svgElement.querySelectorAll('foreignObject');
              foreignObjects.forEach(obj => {
                const divs = obj.querySelectorAll('div');
                divs.forEach(div => {
                  if (div.style.backgroundColor) {
                    div.style.backgroundColor = 'transparent';
                  }
                });
              });
              
              // Make SVG interactive
              svgElement.setAttribute('class', 'cursor-pointer transition-all duration-200');
              
              // Add event listeners for interactive elements
              const nodes = svgElement.querySelectorAll('.node, .actor, .cluster, .task, .section');
              nodes.forEach(node => {
                node.classList.add('hover:opacity-80', 'transition-opacity');
                node.addEventListener('click', (e) => {
                  if (!isPanMode) {
                    e.stopPropagation();
                    // Highlight the clicked node
                    nodes.forEach(n => n.classList.remove('stroke-2', 'stroke-blue-400'));
                    node.classList.add('stroke-2', 'stroke-blue-400');
                  }
                });
              });
              
              // Add tooltips to edges
              const edges = svgElement.querySelectorAll('.edgePath, .messageLine');
              edges.forEach(edge => {
                edge.classList.add('hover:opacity-80', 'transition-opacity');
              });
              
              const textElements = svgElement.querySelectorAll('text');
              textElements.forEach(text => {
                text.style.fill = theme.textColor;
              });
              
              // Remove any remnants of background styling
              const styles = svgElement.querySelectorAll('style');
              styles.forEach(style => {
                let cssText = style.textContent || '';
                cssText = cssText
                  .replace(/background-color:[^;]+;/g, 'background-color:transparent;')
                  .replace(/fill:#0[fF]172[aA];/g, 'fill:transparent;')
                  .replace(/fill:#2[dD]333[bB];/g, 'fill:transparent;')
                  .replace(/background:#0[fF]172[aA];/g, 'background:transparent;')
                  .replace(/background:#2[dD]333[bB];/g, 'background:transparent;');
                style.textContent = cssText;
              });
            }
            
            // Store the rendered diagram to prevent re-rendering
            renderedDiagramRef.current = chart;
          }
        } catch (error) {
          console.error('Failed to render Mermaid diagram:', error);
          if (elementRef.current) {
            elementRef.current.innerHTML = `<pre class="text-red-500">Failed to render diagram: ${(error as Error).message}</pre>`;
          }
        }
      };

      const timer = setTimeout(() => {
        initializeMermaid();
      }, 0);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [chart, isPanMode]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePanMode = () => {
    setIsPanMode(!isPanMode);
    // Reset position when exiting pan mode
    if (isPanMode) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const downloadSVG = () => {
    const svgElement = elementRef.current?.querySelector('svg');
    if (!svgElement) return;
    
    // Create a clone of the SVG to modify for download
    const svgClone = svgElement.cloneNode(true) as SVGElement;
    
    // Set explicit dimensions
    svgClone.setAttribute('width', svgElement.getBoundingClientRect().width.toString());
    svgClone.setAttribute('height', svgElement.getBoundingClientRect().height.toString());
    
    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = 'mermaid-diagram.svg';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Clean up
    URL.revokeObjectURL(svgUrl);
  };

  // Handle wheel events for zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom(prev => Math.max(0.5, Math.min(prev + delta, 2)));
    }
  };

  // Add global style to fix mermaid bg
  useEffect(() => {
    // Create and inject a style element to override mermaid's backgrounds
    const styleId = 'mermaid-transparent-bg';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.innerHTML = `
        .mermaid {
          background-color: transparent !important;
          border: none !important;
        }
        .mermaid svg {
          background-color: transparent !important;
        }
        .mermaid svg rect {
          fill-opacity: 1 !important;
        }
        .mermaid .rect.basic, .mermaid rect.basic {
          fill: #2d333b !important;
        }
        .mermaid .label {
          background-color: transparent !important;
        }
        .mermaid g[class*="root"] > rect {
          fill: transparent !important;
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        const el = document.getElementById(styleId);
        if (el) document.head.removeChild(el);
      };
    }
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`my-4 relative group cursor-grab active:cursor-grabbing`}
      onWheel={handleWheel}
      style={{ 
        borderRadius: '6px',
        padding: '16px',
        overflow: 'hidden', // Prevent scrollbars from appearing
        backgroundColor: 'transparent' // Ensure transparent background
      }}
    >
      {/* Controls overlay */}
      <div className="absolute top-2 right-2 flex space-x-1 bg-gray-800 bg-opacity-80 p-1 rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md">
        <button 
          onClick={handleZoomIn} 
          className="p-1 hover:bg-gray-700 rounded"
          title="Zoom In"
        >
          <ZoomIn size={16} className="text-gray-300" />
        </button>
        <button 
          onClick={handleZoomOut} 
          className="p-1 hover:bg-gray-700 rounded"
          title="Zoom Out"
        >
          <ZoomOut size={16} className="text-gray-300" />
        </button>
        <button 
          onClick={togglePanMode} 
          className={`p-1 hover:bg-gray-700 rounded ${isPanMode ? 'bg-blue-700' : ''}`}
          title={isPanMode ? "Exit Pan Mode" : "Enter Pan Mode"}
        >
          <Move size={16} className="text-gray-300" />
        </button>
        <button 
          onClick={toggleFullscreen} 
          className="p-1 hover:bg-gray-700 rounded"
          title="Toggle Fullscreen"
        >
          <Maximize size={16} className="text-gray-300" />
        </button>
        <button 
          onClick={downloadSVG} 
          className="p-1 hover:bg-gray-700 rounded"
          title="Download SVG"
        >
          <Download size={16} className="text-gray-300" />
        </button>
      </div>
      
      {/* Diagram content - using a wrapper to maintain proper sizing */}
      <div className="w-full" style={{ maxWidth: '100%', backgroundColor: 'transparent', border: 'none' }}>
        <div 
          ref={elementRef} 
          className="bg-transparent"
          style={{ 
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform',
            width: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            // Create space for the diagram to move without causing scrollbars
            margin: `0 ${zoom > 1 ? '5%' : '0'}`
          }}
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;