import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) {
    return null;
  }
  
  // This is a simplified renderer. For full markdown, a library like 'marked' or 'react-markdown' would be better.
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>')       // Italic
    .replace(/`([^`]+)`/g, '<code>$1</code>')   // Inline code
    .replace(/\n/g, '<br />');                  // Newlines

  return <div dangerouslySetInnerHTML={{ __html: formattedContent }} />;
};

export default MarkdownRenderer;
