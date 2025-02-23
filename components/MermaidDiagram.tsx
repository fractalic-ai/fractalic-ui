import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  isDarkMode: boolean;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, isDarkMode = true }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const theme = {
      dark: {
        background: '#22272e',
        primaryColor: '#adbac7',
        secondaryColor: '#768390',
        tertiaryColor: '#636e7b',
        primaryBorderColor: '#444c56',
        secondaryBorderColor: '#373e47',
        lineColor: '#768390',
        textColor: '#adbac7',
        mainBkg: '#22272e',
        nodeBkg: '#2d333b',
        nodeTextColor: '#adbac7',
        edgeLabelBackground: '#22272e',
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
        altSectionBkgColor: '#22272e',
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
      },
      light: {
        background: '#ffffff',
        primaryColor: '#24292f',
        secondaryColor: '#57606a',
        tertiaryColor: '#6e7781',
        primaryBorderColor: '#d0d7de',
        secondaryBorderColor: '#d8dee4',
        lineColor: '#57606a',
        textColor: '#24292f',
        mainBkg: '#ffffff',
        nodeBkg: '#f6f8fa',
        nodeTextColor: '#24292f',
        edgeLabelBackground: '#ffffff',
        clusterBkg: '#f6f8fa',
        titleColor: '#24292f',
        actorBorder: '#d0d7de',
        actorBkg: '#f6f8fa',
        actorTextColor: '#24292f',
        actorLineColor: '#57606a',
        signalColor: '#57606a',
        signalTextColor: '#24292f',
        labelBoxBkgColor: '#f6f8fa',
        labelBoxBorderColor: '#d0d7de',
        labelTextColor: '#24292f',
        loopTextColor: '#24292f',
        noteBorderColor: '#d0d7de',
        noteBkgColor: '#f6f8fa',
        noteTextColor: '#24292f',
        activationBorderColor: '#d0d7de',
        activationBkgColor: '#f6f8fa',
        sequenceNumberColor: '#24292f',
        sectionBkgColor: '#f6f8fa',
        altSectionBkgColor: '#ffffff',
        sectionBkgColor2: '#f6f8fa',
        excludeBkgColor: '#f6f8fa',
        taskBorderColor: '#d0d7de',
        taskBkgColor: '#f6f8fa',
        taskTextColor: '#24292f',
        taskTextLightColor: '#24292f',
        taskTextOutsideColor: '#24292f',
        activeTaskBorderColor: '#57606a',
        activeTaskBkgColor: '#f6f8fa',
        gridColor: '#d0d7de',
        doneTaskBkgColor: '#f6f8fa',
        doneTaskBorderColor: '#d0d7de',
        critBorderColor: '#cf222e',
        critBkgColor: '#f6f8fa',
        todayLineColor: '#cf222e',
        personBorder: '#d0d7de',
        personBkg: '#f6f8fa',
      }
    };

    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: theme.dark,
      securityLevel: 'loose',
      fontFamily: 'inherit',
      flowchart: {
        curve: 'basis',
        padding: 15,
      },
      sequence: {
        actorMargin: 50,
        messageMargin: 40,
        mirrorActors: false,
      },
      gantt: {
        leftPadding: 75,
      }
    });

    const renderChart = async () => {
      if (elementRef.current) {
        try {
          const { svg } = await mermaid.render(chartId.current, chart);
          elementRef.current.innerHTML = svg;
        } catch (error) {
          elementRef.current.innerHTML = `<pre class="text-red-500">Failed to render diagram: ${error.message}</pre>`;
        }
      }
    };

    renderChart();

    return () => {
      if (elementRef.current) {
        elementRef.current.innerHTML = '';
      }
    };
  }, [chart, isDarkMode]);

  const containerStyle: React.CSSProperties = {
    margin: '1rem 0',
    overflowX: 'auto',
    backgroundColor: isDarkMode ? '#0d1117' : '#ffffff',
    border: isDarkMode ? '1px solid #30363d' : '1px solid #e1e4e8',
    borderRadius: '6px',
    boxShadow: isDarkMode
      ? '0 1px 3px rgba(1, 4, 9, 0.12), 0 8px 24px rgba(1, 4, 9, 0.12)'
      : '0 1px 3px rgba(27, 31, 35, 0.12), 0 8px 24px rgba(27, 31, 35, 0.12)',
    padding: '16px',
  };

  return <div ref={elementRef} style={containerStyle} />;
};

export default MermaidDiagram;