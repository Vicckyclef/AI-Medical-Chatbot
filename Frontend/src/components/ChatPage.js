import React, { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import { defaultSchema } from 'hast-util-sanitize';
import { debounce } from 'lodash';
import { IoSend } from "react-icons/io5";
import { FiLogOut } from "react-icons/fi";
import { sendChatMessage, fetchCurrentUser, fetchChatHistory } from "../utils/api";
import { saveToken, removeToken, getAccessToken, getRefreshToken } from "../utils/auth";
import { handleApiError } from "../utils/errorHandler";
import { MessageLoader } from "./LoadingSpinner";
import "./ChatPage.css";

// Safe image component with error handling
const SafeImage = ({ src, alt, ...props }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    // If the image is a send button, render a text arrow as fallback
    if (alt === "Send") {
      return (
        <span className="image-fallback" style={{ fontSize: '18px', fontWeight: 'bold' }}>
          →
        </span>
      );
    }
    return <span className="image-fallback">{alt}</span>;
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      onError={() => setError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      {...props} 
    />
  );
};



const ChatPage = ({ className, ...props }) => {
  console.log("ChatPage rendering");
  const [isSidebarActive, setIsSidebarActive] = useState(true);
  const [messages, setMessages] = useState([]);
  // State to track if messages are being preprocessed
  const [preprocessingMessages, setPreprocessingMessages] = useState(false);
  const [initialInputValue, setInitialInputValue] = useState("");
  const [conversationInputValue, setConversationInputValue] = useState("");
  const [isInConversation, setIsInConversation] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [showRecentChats, setShowRecentChats] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userName, setUserName] = useState("User"); // New state for user name
  const [avatarUrl, setAvatarUrl] = useState(null); // New state for avatar URL

  const handleLogout = () => {
    removeToken();
    window.location.href = "/login";
  };

  const toggleSidebar = () => {
    setIsSidebarActive((prevState) => !prevState);
  };

  const toggleRecentChats = () => {
    setShowRecentChats((prevState) => !prevState);
  };
  // Consolidated input handler for both input fields
  const handleInputChange = (e, inputType) => {
    const newValue = e.target.value;
    console.log(`${inputType} input changing to:`, newValue);
    
    if (inputType === 'initial') {
      setInitialInputValue(newValue);
    } else {
      setConversationInputValue(newValue);
    }
    
    console.log("State update requested for", inputType, "with value:", newValue);
  };

  // Function to ensure markdown is properly formatted
  const ensureMarkdownFormatting = (text) => {
    if (!text) return text;
    
    // Clone the text to avoid direct mutations
    let formatted = text;
    
    // Initial check for common patterns that might indicate markdown but need formatting
    const potentiallyMarkdown = /[#*-_`>|[]]/g.test(formatted);
    if (!potentiallyMarkdown) {
      return formatted; // If no markdown markers, return as is
    }
    
    // Pre-processing: normalize line endings and ensure proper spacing
    formatted = formatted.replace(/\r\n/g, '\n');
    formatted = formatted.replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
    
    // Fix headings - ensure there's a space after the # symbols and proper formatting
    formatted = formatted.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
    formatted = formatted.replace(/^(#{1,6})\s+(.+?)(\s*?)(#+)?$/gm, '$1 $2'); // Clean up any extra spaces
    
    // Add blank line before headings for better separation (unless at the start)
    formatted = formatted.replace(/([^\n])\n(#{1,6}\s)/gm, '$1\n\n$2');
    
    // Ensure headings have trailing newlines to properly separate from content
    formatted = formatted.replace(/^(#{1,6}\s.+)(\n[^#\n])/gm, '$1\n$2');
    
    // Fix unordered lists - ensure proper spacing and consistent symbol usage (* preferred)
    formatted = formatted.replace(/^(\s*)(\*|-|\+)([^\s])/gm, '$1* $3');
    
    // Fix ordered lists - ensure proper spacing after numbers
    formatted = formatted.replace(/^(\s*)(\d+[.])([^\s])/gm, '$1$2 $3');
    
    // Special handling for nested lists - ensure proper indentation
    formatted = formatted.replace(/^(\s+)(\*|\d+\.)([^\n]+)$/gm, (match, indent, marker, content) => {
        // Ensure indent is a multiple of 2 spaces for consistency
        const newIndent = ' '.repeat(Math.ceil(indent.length / 2) * 2);
        return `${newIndent}${marker === '*' ? '*' : marker} ${content.trim()}`;
    });
    
    // Detect plain-text lists that should be markdown
    // Convert patterns like "1) Text" or "1. Text" without space to proper markdown
    formatted = formatted.replace(/^(\s*)(\d+[.])\s*([^\s])/gm, '$1$2 $3');
    
    // Convert patterns like "• Text" or "· Text" to proper markdown bullets
    formatted = formatted.replace(/^(\s*)[•·]([^\s])/gm, '$1* $2');
    
    // Ensure proper line breaks between list items
    // If a list item doesn't have a blank line before it, add one (except for consecutive items)
    formatted = formatted.replace(/([^\n*\-+\d\s])\n(\s*)(\*|\-|\+|\d+\.)\s/g, '$1\n\n$2$3 ');
    
    // Proper spacing and formatting for code blocks
    formatted = formatted.replace(/(\n)```([^\s])/g, '$1```\n$2');
    formatted = formatted.replace(/([^\s])```(\n|$)/g, '$1\n```$2');
    
    // Enhanced code block formatting
    formatted = formatted.replace(/```(\w*)\s*\n([\s\S]*?)\n```/g, (match, lang, code) => {
        // Trim extra whitespace but preserve indentation within code block
        const trimmedCode = code.split('\n').map(line => line.trimEnd()).join('\n');
        return `\n\`\`\`${lang.trim()}\n${trimmedCode}\n\`\`\`\n`;
    });
    
    // Ensure inline code has proper spacing
    formatted = formatted.replace(/([^\s`])`([^`\s])/g, '$1 `$2');
    formatted = formatted.replace(/([^`\s])`([^\s`])/g, '$1` $2');
    
    // Improve bold and italic formatting
    // Bold (**text**)
    formatted = formatted.replace(/(\S)(\*\*)([^\s*])/g, '$1 $2$3');
    formatted = formatted.replace(/([^\s*])(\*\*)(\S)/g, '$1$2 $3');
    
    // Italic (*text*)
    formatted = formatted.replace(/(\S)(\*)([^\s*])/g, '$1 $2$3');
    formatted = formatted.replace(/([^\s*])(\*)(\S)/g, '$1$2 $3');
    
    // Ensure proper spacing for links
    formatted = formatted.replace(/([^\s\[])(\[)/g, '$1 $2');
    formatted = formatted.replace(/(\])(\()/g, '$1$2');
    
    // Special handling for pipe characters
    // First, identify and temporarily replace pipes within code blocks to protect them
    const codeBlocks = [];
    formatted = formatted.replace(/```[\s\S]*?```|`[^`]*`/g, match => {
        const placeholder = `__PROTECTED_CODE_${codeBlocks.length}__`;
        codeBlocks.push(match);
        return placeholder;
    });
    
    // Now handle pipe characters that are not part of tables
    // 1. First identify potential table lines (lines with properly formatted pipes)
    const lines = formatted.split('\n');
    const tableLineIndices = new Set();
    
    // Identify lines that are likely part of tables
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Check if this line could be a table row
        if (line.startsWith('|') && line.endsWith('|') && (line.match(/\|/g) || []).length >= 2) {
            tableLineIndices.add(i);
            // Mark adjacent lines that are likely part of the same table
            if (i > 0) {
                const prevLine = lines[i-1].trim();
                if (prevLine.startsWith('|') && prevLine.endsWith('|')) {
                    tableLineIndices.add(i-1);
                }
            }
            if (i < lines.length - 1) {
                const nextLine = lines[i+1].trim();
                if (nextLine.startsWith('|') && nextLine.endsWith('|') || nextLine.match(/^\|[\s\-:]+\|$/)) {
                    tableLineIndices.add(i+1);
                }
            }
        }
        // Also check for separator rows
        if (line.match(/^\|[\s\-:]+\|$/)) {
            tableLineIndices.add(i);
            // Mark adjacent lines that might be part of the table
            if (i > 0) tableLineIndices.add(i-1);
            if (i < lines.length - 1) tableLineIndices.add(i+1);
        }
    }
    
    // Now process each line
    for (let i = 0; i < lines.length; i++) {
        if (!tableLineIndices.has(i)) {
            // This line is not part of a table, escape standalone pipes
            lines[i] = lines[i].replace(/\|/g, '\\|');
        } else {
            // This line is part of a table, ensure proper formatting
            lines[i] = lines[i].replace(/([^\s])\|([^\s])/g, '$1 | $2');
            
            // If this appears to be a header row, ensure there's a separator row
            if (tableLineIndices.has(i) && 
                !tableLineIndices.has(i-1) && // First row of a table
                i < lines.length - 1 &&
                !lines[i+1].match(/^\|[\s\-:]+\|$/)) {
                
                // Count columns in this row
                const columns = lines[i].split('|').filter(Boolean).length;
                // Create separator row
                const separatorRow = '|' + Array(columns).fill(' --- |').join('');
                
                // Insert separator row
                lines.splice(i+1, 0, separatorRow);
                tableLineIndices.add(i+1);
                i++; // Skip the newly inserted line
            }
        }
    }
    
    formatted = lines.join('\n');
    
    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        formatted = formatted.replace(`__PROTECTED_CODE_${index}__`, block);
    });
    
    // Additional table formatting to ensure proper structure
    formatted = formatted.replace(/^\|\s*(.+?)\s*\|$/gm, '| $1 |');
    
    // Ensure table rows have proper structure
    formatted = formatted.replace(/^\|\s*(.+?)\s*\|$/gm, '| $1 |');
    
    // Make sure horizontal rules have proper spacing
    formatted = formatted.replace(/([^\n])(\n)(\-{3,}|\*{3,}|_{3,})(\n)/g, '$1\n\n$3\n');
    
    // Add line break for blockquotes if needed
    formatted = formatted.replace(/([^\n>])(\n>)/g, '$1\n\n>');
    
    // Ensure blockquote syntax has space after >
    formatted = formatted.replace(/^(>)([^\s])/gm, '$1 $2');
    
    return formatted;
  };
  
  // Function to preprocess messages with complex markdown
  const preprocessMessages = (messages) => {
    return messages.map(msg => {
      if (msg.sender === "bot") {
        // Check if text is defined before processing
        if (!msg.text) return msg;
        
        // Apply more advanced markdown formatting
        let formattedText = msg.text;
        
        // First, preserve any existing properly formatted markdown elements
        // by temporarily replacing them with placeholders
        
        // Store code blocks
        const codeBlocks = [];
        formattedText = formattedText.replace(/```([\s\S]*?)```/g, (match) => {
          const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
          codeBlocks.push(match);
          return placeholder;
        });
        
        // Store inline code
        const inlineCodes = [];
        formattedText = formattedText.replace(/`([^`]+)`/g, (match) => {
          const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
          inlineCodes.push(match);
          return placeholder;
        });
        
        // Now apply formatting
        formattedText = ensureMarkdownFormatting(formattedText);
        
        // 1. Ensure headers are properly formatted - this needs special care
        formattedText = formattedText.replace(/^(#{1,6})[ ]*(.+)$/gm, (match, hashes, content) => {
          return `${hashes} ${content.trim()}`;
        });
        
        // 2. Handle lists - important for medical content
        // Make sure unordered lists use consistent symbols and proper spacing
        formattedText = formattedText.replace(/^(\s*)[-*+][ ]*(.+)$/gm, (match, indent, content) => {
          return `${indent}* ${content.trim()}`;
        });
        
        // Ensure multi-level lists have proper indentation
        formattedText = formattedText.replace(/^( {1,3})(\*|\d+\.) /gm, '  $2 '); // First level
        formattedText = formattedText.replace(/^( {4,7})(\*|\d+\.) /gm, '    $2 '); // Second level
        formattedText = formattedText.replace(/^( {8,})(\*|\d+\.) /gm, '      $2 '); // Third+ level
        
        // Make ordered lists consistent and properly spaced
        formattedText = formattedText.replace(/^(\s*)\d+\.[ ]*(.+)$/gm, (match, indent, content) => {
          return `${indent}1. ${content.trim()}`;
        });
        
        // 3. Handle potential medical bullet points that might not be in proper markdown
        formattedText = formattedText.replace(/^(\s*)([•○◦·])[ ]*(.+)$/gm, (match, indent, bullet, content) => {
          return `${indent}* ${content.trim()}`;
        });
        
        // 4. Ensure proper line breaks between paragraphs
        formattedText = formattedText.replace(/([^\n])\n([^\n#>*\-\d\s])/g, '$1\n\n$2');
        
        // 5. Format blockquotes for medical references or notes
        formattedText = formattedText.replace(/^>[ ]*(.+)$/gm, (match, content) => {
          return `> ${content.trim()}`;
        });
        
        // 6. Special handling for bold and italic, common in medical terms
        // Bold
        formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
          return `**${content.trim()}**`;
        });
        
        // Italic
        formattedText = formattedText.replace(/\*([^*]+)\*/g, (match, content) => {
          return `*${content.trim()}*`;
        });
        
        // 7. Special handling for other special characters
        // Handle backslashes in text that aren't escape sequences
        formattedText = formattedText.replace(/\\([^\\`*_{}[\]()#+\-.!|])/g, '\\\\$1');
        
        // 8. Special handling for pipe characters
        // First identify lines that are likely tables
        const lines = formattedText.split('\n');
        const tableLineIndices = new Set();
        
        // Find potential table lines
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|') && 
                (line.match(/\|/g) || []).length >= 2) {
                tableLineIndices.add(i);
                // Check adjacent lines that might be part of the table
                if (i > 0) tableLineIndices.add(i-1);
                if (i < lines.length - 1) tableLineIndices.add(i+1);
            }
            if (line.match(/^\|[\s\-:]+\|$/)) {
                tableLineIndices.add(i);
                if (i > 0) tableLineIndices.add(i-1);
                if (i < lines.length - 1) tableLineIndices.add(i+1);
            }
        }
        
        // Process lines for pipe handling
        for (let i = 0; i < lines.length; i++) {
            if (!tableLineIndices.has(i)) {
                // Escape pipes that are not part of tables
                lines[i] = lines[i].replace(/(?<!\\)\|/g, '\\|');
            }
        }
        
        formattedText = lines.join('\n');
        
        // Now restore the code blocks and inline code
        codeBlocks.forEach((block, index) => {
          formattedText = formattedText.replace(`__CODE_BLOCK_${index}__`, block);
        });
        
        inlineCodes.forEach((code, index) => {
          formattedText = formattedText.replace(`__INLINE_CODE_${index}__`, code);
        });
        
        // Final clean-up for code blocks to ensure proper formatting
        formattedText = formattedText.replace(/```(\w*)\s*\n([\s\S]*?)\n```/g, (match, lang, code) => {
          return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`;
        });
        
        // Final verification of markdown elements
        // Ensure headers have proper syntax and spacing
        formattedText = formattedText.replace(/^(#{1,6})\s*(.+?)$/gm, (match, hashes, content) => {
          return `${hashes} ${content.trim()}`;
        });
        
        // Ensure lists have proper formatting
        formattedText = formattedText.replace(/^(\s*)([-*+])\s*(.+?)$/gm, (match, spaces, bullet, content) => {
          return `${spaces}* ${content.trim()}`;
        });
        
        // Ensure ordered lists are properly formatted
        formattedText = formattedText.replace(/^(\s*)(\d+\.)\s*(.+?)$/gm, (match, spaces, number, content) => {
          return `${spaces}${number} ${content.trim()}`;
        });
        
        return {
          ...msg,
          text: formattedText
        };
      }
      return msg;
    });
  };

  // Function to debug and enhance markdown rendering
  const enhanceMarkdown = (text) => {
    if (!text) return text;
    
    // Apply additional preprocessing for specific content patterns
    let enhanced = text;
    
    // Fix common formatting issues in medical content
    
    // 1. Ensure headers have proper spacing and formatting
    enhanced = enhanced.replace(/^(#{1,6})(?!\s)/gm, '$1 ');
    
    // 2. Ensure lists have proper bullet points and spacing
    enhanced = enhanced.replace(/^(\s*)[-•●○◦](?!\s)/gm, '$1* ');
    
    // 3. Ensure numbered lists have proper spacing
    enhanced = enhanced.replace(/^(\s*)\d+\.(?!\s)/gm, '$1$& ');
    
    // 4. Fix tables to ensure they have separators and proper cell spacing
    const lines = enhanced.split('\n');
    const tableStartLineIndices = [];
    
    // Find table start lines
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|') && 
          (lines[i].match(/\|/g) || []).length >= 3) {
        tableStartLineIndices.push(i);
      }
    }
    
    // Process each table
    for (let startIdx of tableStartLineIndices) {
      // Check if next line is a separator line
      if (startIdx + 1 < lines.length && 
          !lines[startIdx + 1].match(/^\s*\|[\s-:]+\|[\s-:]+\|/)) {
        // Count columns
        const columnCount = (lines[startIdx].match(/\|/g) || []).length - 1;
        // Insert separator line
        const separatorLine = '|' + Array(columnCount).fill(' --- |').join('');
        lines.splice(startIdx + 1, 0, separatorLine);
      }
    }
    
    enhanced = lines.join('\n');
    
    return enhanced;
  };
  
  // Function to generate a title from conversation content
  const generateTitle = (messages) => {
    if (!messages || messages.length === 0) {
      return "New Conversation";
    }
    
    // Try to extract title from the first user message
    const firstUserMessage = messages.find(msg => msg.sender === "user");
    if (firstUserMessage) {
      // Extract the first sentence or first few words
      const text = firstUserMessage.text;
      
      // Remove markdown formatting for cleaner titles
      const cleanText = text
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Extract bold text
        .replace(/\*([^*]+)\*/g, '$1') // Extract italic text
        .replace(/`[^`]*`/g, match => match.replace(/`/g, '')) // Clean code blocks
        .replace(/\[[^\]]*\]\([^)]*\)/g, match => { // Extract link text
          const linkText = match.match(/\[(.*?)\]/);
          return linkText ? linkText[1] : '';
        })
        .replace(/^\s+|\s+$/g, '') // Trim whitespace
        .replace(/\s{2,}/g, ' '); // Normalize spaces
      
      // Check if the text is a question (starts with common question words or ends with question mark)
      const isQuestion = /^(what|how|why|when|where|who|is|are|can|could|should|would|will|do|does|did|has|have)/i.test(cleanText) || 
                         cleanText.endsWith('?');
      
      // Try to get the first sentence (ending with period, question mark, or exclamation)
      let sentenceMatch = cleanText.match(/^[^.!?]+[.!?]/);
      
      // If no match, check for a comma-separated phrase
      if (!sentenceMatch) {
        sentenceMatch = cleanText.match(/^[^,]+,/);
      }
      
      if (sentenceMatch) {
        // Limit to 35 characters for better display
        return sentenceMatch[0].substring(0, 35).trim() + (sentenceMatch[0].length > 35 ? "..." : "");
      }
      
      // If no sentence found, take the first 4-5 words or 35 characters
      const words = cleanText.split(/\s+/).slice(0, 5).join(" ");
      const title = words.length > 35 ? words.substring(0, 32) + "..." : words;
      
      // Prepend question mark if it's likely a question but doesn't have one
      if (isQuestion && !title.includes('?')) {
        return title + (title.endsWith('...') ? '' : '?');
      }
      
      return title;
    }
    
    // If no user message, try to use the bot's first message
    const firstBotMessage = messages.find(msg => msg.sender === "bot");
    if (firstBotMessage) {
      // Extract content from bot response
      const cleanText = firstBotMessage.text
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .substring(0, 100); // Take just the beginning
        
      // Look for a potential title in the bot's response
      const potentialTitle = cleanText.split(/\n/)[0]; // First line
      if (potentialTitle && potentialTitle.length > 5) {
        return potentialTitle.substring(0, 40).trim() + (potentialTitle.length > 40 ? "..." : "");
      }
    }
    
    // If nothing suitable found, use timestamp with better formatting
    return "Chat - " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleSend = async () => {
    // Determine which input value to use based on conversation state
    const currentInputValue = isInConversation ? conversationInputValue : initialInputValue;
    console.log("handleSend called with input:", currentInputValue);
    
    // Validate input
    const trimmedInput = currentInputValue.trim();
    if (!trimmedInput) {
      console.log("Empty input, not sending");
      return;
    }
    
    // Clear input field immediately
    if (isInConversation) {
      setConversationInputValue("");
      console.log("Conversation input field cleared");
    } else {
      setInitialInputValue("");
      console.log("Initial input field cleared");
    }
    
    // Force immediate check that state was updated
    setTimeout(() => {
      const updatedValue = isInConversation ? conversationInputValue : initialInputValue;
      console.log("Verifying input cleared, current value:", updatedValue);
    }, 0);
    
    // Add user message to state
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", text: trimmedInput },
    ]);

    if (!isInConversation) {
      setIsInConversation(true);
    }

    // Add loading state
    const messageId = Date.now(); // Unique ID for this message
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "bot", text: "", isLoading: true, id: messageId }
    ]);

    try {
      console.log("Sending message to API:", trimmedInput);
      const response = await sendChatMessage(trimmedInput); // Use enhanced API function
      let botMessage = response?.response || "No valid response received.";
      console.log("Received bot response:", botMessage);
      
      // Remove loading message
      setMessages((prevMessages) => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
      
      // Check if response might be JSON that needs to be parsed
      if (botMessage.startsWith('{') && botMessage.endsWith('}')) {
        try {
          const parsedResponse = JSON.parse(botMessage);
          if (parsedResponse.response) {
            botMessage = parsedResponse.response;
          }
        } catch (e) {
          console.log("Response is not valid JSON, treating as plain text");
        }
      }
      
      // Initial cleaning of the response for better readability
      botMessage = botMessage
        .replace(/\r\n/g, '\n')                    // Normalize line endings
        .replace(/\n{3,}/g, '\n\n')                // Limit excessive newlines
        .replace(/^\s+|\s+$/g, '')                 // Trim leading/trailing whitespace
        .replace(/\n\s*\n/g, '\n\n');              // Convert multi-blank lines to double newline
      
      // Enhance formatting detection - specially focusing on medical content patterns
      const containsHeadings = /^#+\s/m.test(botMessage);
      const containsLists = /^(\s*[-*+]|\d+[.)])\s/m.test(botMessage);
      const containsCode = /```|`/g.test(botMessage);
      const containsEmphasis = /\*\*|\*|__|\b_\b/g.test(botMessage);
      const containsPotentialLists = /^(\d+[.]|-|•|\*|○|◦|·)/gm.test(botMessage);
      const containsPlainTextLists = /^\s*\d+[.]\s|^\s*[-•○◦·]\s/gm.test(botMessage);
      
      console.log("Formatting analysis:", {
        containsHeadings,
        containsLists,
        containsCode,
        containsEmphasis,
        containsPotentialLists,
        containsPlainTextLists
      });
      
      // Special handling for medical content
      // Convert common plain text medical list formats to proper markdown
      if (containsPlainTextLists) {
        botMessage = botMessage.replace(/^(\s*)(\d+)[.](\s+)(.+)$/gm, '$1$2.$3$4');
        botMessage = botMessage.replace(/^(\s*)[•○◦·-](\s+)(.+)$/gm, '$1*$2$3');
      }
      
      // Apply enhanced markdown formatting
      botMessage = ensureMarkdownFormatting(botMessage);
      
      // Apply additional enhancements for better markdown rendering
      botMessage = enhanceMarkdown(botMessage);
      
      // Additional processing for specific cases
      
      // If we detect pattern of numbered lines or bullets without proper markdown formatting
      if (containsPotentialLists) {
        console.log("Enhancing list formatting in response");
        
        // Convert numbered items without proper spacing
        botMessage = botMessage.replace(/^(\d+[.])([^\s])/gm, '$1 $2');
        
        // Ensure bullet points with symbols like •, -, * have proper markdown format
        botMessage = botMessage.replace(/^(•|-(?!--))([^\s])/gm, '* $2');
        
        // Add newlines between list items if missing
        botMessage = botMessage.replace(/(\n)(\s*)([-*+]|\d+\.)\s([^\n]+)(\n)(\s*)([-*+]|\d+\.)/g, 
                                      '$1$2$3 $4$5$5$6$7');
      }
      
      // Special handling for pipe characters and other special markdown syntax
      console.log("Checking for special characters that need processing");
      
      // First protect code blocks from processing
      const codeSegments = [];
      botMessage = botMessage.replace(/```[\s\S]*?```|`[^`]*`/g, match => {
          const placeholder = `__CODE_PLACEHOLDER_${codeSegments.length}__`;
          codeSegments.push(match);
          return placeholder;
      });
      
      // Process pipe characters
      if (botMessage.includes('|')) {
          console.log("Detected pipe characters, processing for proper markdown");
          
          // Identify potential table lines
          const lines = botMessage.split('\n');
          const tableLines = new Set();
          
          // Find lines that are likely part of tables
          for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              const pipeCount = (line.match(/\|/g) || []).length;
              
              // Check if this line looks like a table row or header
              if (pipeCount >= 2 && line.startsWith('|') && line.endsWith('|')) {
                  tableLines.add(i);
                  
                  // If this might be a header row, check if next line is a separator
                  if (i < lines.length - 1) {
                      const nextLine = lines[i+1].trim();
                      if (!nextLine.match(/^\|[\s\-:]+\|$/)) {
                          // Create and insert a separator row
                          const columnCount = line.split('|').length - 2; // -2 for empty first/last elements
                          const separatorRow = '|' + Array(columnCount).fill(' --- |').join('');
                          lines.splice(i+1, 0, separatorRow);
                          tableLines.add(i+1);
                          i++; // Skip the inserted line
                      } else {
                          tableLines.add(i+1); // Mark existing separator
                      }
                  }
              }
              // Also check for separator lines
              else if (line.match(/^\|[\s\-:]+\|$/)) {
                  tableLines.add(i);
              }
          }
          
          // Process each line
          for (let i = 0; i < lines.length; i++) {
              if (tableLines.has(i)) {
                  // Format table line - ensure proper spacing
                  lines[i] = lines[i].replace(/([^\s])\|/g, '$1 |').replace(/\|([^\s])/g, '| $1');
              } else if (lines[i].includes('|')) {
                  // Escape pipes in non-table lines
                  lines[i] = lines[i].replace(/(?<!\\)\|/g, '\\|');
              }
          }
          
          botMessage = lines.join('\n');
      }
      
      // Restore code blocks
      codeSegments.forEach((segment, index) => {
          botMessage = botMessage.replace(`__CODE_PLACEHOLDER_${index}__`, segment);
      });
      
      // Specific enhancement for headings
      if (containsHeadings) {
        console.log("Enhancing heading formatting");
        
        // Ensure heading with proper spacing and line breaks
        botMessage = botMessage.replace(/([^\n])(\n)(#{1,6}\s)/g, '$1\n\n$3');
        
        // Add extra newline after headings if missing
        botMessage = botMessage.replace(/(#{1,6}\s[^\n]+)(\n)([^#\n])/g, '$1\n\n$3');
      }
      
      // Special handling for code blocks
      if (containsCode) {
        console.log("Enhancing code block formatting");
        
        // Ensure code blocks have proper line breaks
        botMessage = botMessage.replace(/([^\n])(\n```)/g, '$1\n\n```');
        botMessage = botMessage.replace(/(```\s*\w*)(\n)([^\n])/g, '$1\n\n$3');
        botMessage = botMessage.replace(/(```)(\n)([^`\n])/g, '$1\n\n$3');
      }
      
      // Process message text function - extracted for better maintainability
      const processMessageText = (text) => {
        if (!text) return text;
        return ensureMarkdownFormatting(text);
      };
      
      // Update messages function - extracted for better maintainability
      const updateMessages = (prevMessages, botMessage) => {
        // Apply preprocessing to ensure proper markdown formatting
        const formattedBotMessage = processMessageText(botMessage);
        
        const newMessages = [
          ...prevMessages, 
          { sender: "bot", text: formattedBotMessage }
        ];
        
        // Schedule preprocessing for better rendering
        setPreprocessingMessages(true);
        setTimeout(() => {
          // Apply a more thorough preprocessing pass to ensure all markdown is correctly formatted
          const fullyProcessedMessages = newMessages.map(msg => {
            if (msg.sender === "bot") {
              // Verify text exists before processing
              if (!msg.text) return msg;
              
              // Apply a series of specific formatting rules to ensure markdown renders correctly
              let enhancedText = msg.text;
              
              // Log the text for debugging
              console.log("Processing bot message:", enhancedText.substring(0, 100) + "...");
              
              // Add final touch to ensure markdown elements render correctly
              
              // Final formatting pass for headers
              enhancedText = enhancedText.replace(/^(#{1,6})(?!\s)/gm, '$1 ');
              enhancedText = enhancedText.replace(/^(#{1,6})\s+(.+?)(\s+#+)?$/gm, '$1 $2');
              
              // Ensure proper spacing around headers
              enhancedText = enhancedText.replace(/([^\n])(\n#{1,6}\s)/g, '$1\n\n$2');
              enhancedText = enhancedText.replace(/(^#{1,6}\s.+)(\n[^#\n])/gm, '$1\n\n$2');
              
              // Ensure list items have proper formatting with consistent symbols
              enhancedText = enhancedText.replace(/^(\s*)[-*+](?!\s)/gm, '$1* ');
              enhancedText = enhancedText.replace(/^(\s*)\d+\.(?!\s)/gm, '$1$& ');
              
              // Double-check for any potential medical bullet points still not formatted
              enhancedText = enhancedText.replace(/^(\s*)[•○◦·](?!\s)/gm, '$1* ');
              
              // Fix any nested lists that might not have proper formatting
              enhancedText = enhancedText.replace(/^(\s{2,})([*+-])(?!\s)/gm, '$1$2 ');
              
              // Ensure blockquotes have proper space
              enhancedText = enhancedText.replace(/^>(?!\s)/gm, '> ');
              
              // Add proper spacing to nested blockquotes
              enhancedText = enhancedText.replace(/^(\s*?>+)(?!\s)/gm, '$1 ');
              
              // Fix inline code spacing (important for medical terms with special formatting)
              enhancedText = enhancedText.replace(/([^\s`])`([^`])/g, '$1 `$2');
              enhancedText = enhancedText.replace(/([^`])`([^\s`])/g, '$1` $2');
              
              // Fix bold and italic syntax for better display
              enhancedText = enhancedText.replace(/\*\*([^*\s][^*]*[^*\s])\*\*/g, '**$1**');
              enhancedText = enhancedText.replace(/\*([^*\s][^*]*[^*\s])\*/g, '*$1*');
              
              // Special handling for pipe characters
              // First, protect pipes inside code blocks
              const codeSegments = [];
              enhancedText = enhancedText.replace(/```[\s\S]*?```|`[^`]*`/g, match => {
                  const placeholder = `__PROTECTED_CODE_FINAL_${codeSegments.length}__`;
                  codeSegments.push(match);
                  return placeholder;
              });
              
              // Identify table lines
              const lines = enhancedText.split('\n');
              const tableLines = new Set();
              
              // Detect table lines
              for (let i = 0; i < lines.length; i++) {
                  const line = lines[i].trim();
                  if ((line.startsWith('|') && line.endsWith('|') && (line.match(/\|/g) || []).length >= 2) || 
                      line.match(/^\|[\s\-:]+\|$/)) {
                      tableLines.add(i);
                      // Include adjacent lines that might be part of the table
                      if (i > 0 && lines[i-1].trim().match(/\|/)) tableLines.add(i-1);
                      if (i < lines.length - 1 && lines[i+1].trim().match(/\|/)) tableLines.add(i+1);
                  }
              }
              
              // Process each line
              for (let i = 0; i < lines.length; i++) {
                  if (tableLines.has(i)) {
                      // Format table line
                      lines[i] = lines[i].replace(/\|(?!\s)/g, '| ');
                      lines[i] = lines[i].replace(/(?<!\s)\|/g, ' |');
                  } else {
                      // Escape pipes in non-table lines
                      lines[i] = lines[i].replace(/(?<!\\)\|/g, '\\|');
                  }
              }
              
              enhancedText = lines.join('\n');
              
              // Restore code segments
              codeSegments.forEach((segment, index) => {
                  enhancedText = enhancedText.replace(`__PROTECTED_CODE_FINAL_${index}__`, segment);
              });
              
              return { ...msg, text: enhancedText };
            }
            return msg;
          });
          
          setMessages(fullyProcessedMessages);
          setPreprocessingMessages(false);
        }, 50); // Slightly longer timeout for more complex processing
        
        return newMessages;
      };
      
      // Use the extracted function
      setMessages((prevMessages) => updateMessages(prevMessages, botMessage));
    } catch (error) {
      console.error("API call error:", error);
      
      // Remove loading message
      setMessages((prevMessages) => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
      
      // Handle different types of errors
      const errorInfo = handleApiError(error, 'Chat Message');
      let errorMessage = "An error occurred. Please try again later.";
      
      if (errorInfo.type === 'NETWORK' || errorInfo.type === 'TIMEOUT') {
        errorMessage = "Network connection failed. Please check your internet connection and try again.";
      } else if (errorInfo.type === 'SERVER') {
        errorMessage = "Server error. Please try again in a moment.";
      } else if (errorInfo.message) {
        errorMessage = errorInfo.message;
      }
      
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: errorMessage, isError: true },
      ]);
    }

  };

  // Debounced key press handler to prevent rapid submissions
  const handleKeyPress = useCallback(
    debounce((e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent default form submission behavior
        handleSend();
      }
    }, 300),
    [handleSend]
  );

  const handleNewChat = () => {
    console.log("handleNewChat called");
    
    // Prevent multiple rapid executions
    if (isProcessing) {
      console.log("NewChat operation already in progress, ignoring");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Save current conversation to recentChats if there are messages
      if (messages.length > 0) {
        // Ensure all messages have properly formatted markdown before saving
        const processedMessages = preprocessMessages([...messages]);
        
        // Generate a title based on conversation content
        const generatedTitle = generateTitle(processedMessages);
        
        const newChat = {
          title: generatedTitle,
          timestamp: new Date().toISOString(),
          history: processedMessages,
        };
        
        // Add to recentChats using a callback to ensure we have the latest state
        setRecentChats((prevChats) => {
          const uniqueId = newChat.timestamp + '-' + newChat.title;
          // Check if this exact chat already exists to prevent duplicates
          if (prevChats.some(chat => 
              chat.title === newChat.title && 
              JSON.stringify(chat.history) === JSON.stringify(newChat.history))) {
            console.log("This chat is already saved, not adding duplicate");
            return prevChats;
          }
          console.log("Adding new chat to recent chats");
          return [...prevChats, newChat];
        });
      }
      
      // Use React's batching to perform all state updates together
      // This reduces rerenders and potential race conditions
      console.log("Resetting chat state");
      setMessages([]);
      setInitialInputValue("");
      setConversationInputValue("");
      setIsInConversation(false);
      
      console.log("New chat created successfully");
    } catch (error) {
      console.error("Error in handleNewChat:", error);
    } finally {
      // Allow new operations after a short delay to prevent rapid clicks
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }
  };

  const loadChat = (chat) => {
    console.log("loadChat called with:", chat.title);
    
    // Prevent multiple rapid executions
    if (isProcessing) {
      console.log("Chat loading operation already in progress, ignoring");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // First clear any existing chat if needed
      if (messages.length > 0 && !isInConversation) {
        // If we have messages but aren't in conversation, save current as a chat first
        handleNewChat();
      }
      
      // Use React's batching to perform all state updates together
      console.log("Loading chat history:", chat.history.length, "messages");
      // Process messages for proper markdown formatting before setting them
      const processedHistory = preprocessMessages(chat.history);
      setMessages(processedHistory);
      setConversationInputValue("");
      setIsInConversation(true);
      
      console.log("Chat loaded successfully");
    } catch (error) {
      console.error("Error in loadChat:", error);
    } finally {
      // Allow new operations after a short delay
      setTimeout(() => {
        setIsProcessing(false);
      }, 300);
    }
  };

  // Debug useEffect to track input value changes
  useEffect(() => {
    console.log("initialInputValue changed to:", initialInputValue);
    setRenderCount(prev => prev + 1);
  }, [initialInputValue]);
  
  useEffect(() => {
    console.log("conversationInputValue changed to:", conversationInputValue);
    setRenderCount(prev => prev + 1);
  }, [conversationInputValue]);
  
  // Log render count after it updates
  useEffect(() => {
    console.log("Component has rendered", renderCount, "times");
  }, [renderCount]);
  
  // Component cleanup
  useEffect(() => {
    return () => {
      console.log("ChatPage component unmounted");
    };
  }, []);

  // Handle tokens from URL or local storage on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let accessToken = urlParams.get('access_token');
    let refreshToken = urlParams.get('refresh_token');

    // If tokens are not in URL, try to get them from local storage
    if (!accessToken || !refreshToken) {
      accessToken = getAccessToken();
      refreshToken = getRefreshToken();
    }

    if (accessToken && refreshToken) {
      saveToken(accessToken, refreshToken); // Save/re-save to ensure consistency
      // Clear tokens from URL if they were present
      if (urlParams.get('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Fetch user details
      const getUserDetails = async () => {
        try {
          const user = await fetchCurrentUser();
          if (user && user.name) {
            setUserName(user.name);
            setAvatarUrl(user.avatar_url); // Set avatar URL

            // Fetch chat history for the user
            try {
              const history = await fetchChatHistory();
              if (history && history.length > 0) {
                // Group messages into conversations
                const conversations = [];
                let currentConversation = [];

                history.forEach((msg, index) => {
                  currentConversation.push(msg);
                  // A new conversation starts with a user message, or if it's the last message
                  if (msg.sender === "bot" || index === history.length - 1) {
                    conversations.push({
                      title: generateTitle(currentConversation),
                      timestamp: msg.timestamp, // Use the timestamp of the last message
                      history: currentConversation,
                    });
                    currentConversation = [];
                  }
                });
                setRecentChats(conversations);
                // Load the latest conversation into the main chat window
                setMessages(conversations[conversations.length - 1].history);
                setIsInConversation(true);
              }
            } catch (historyError) {
              console.error("Failed to fetch chat history:", historyError);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user details:", error);
          // Optionally, handle error (e.g., redirect to login if token is invalid)
          removeToken(); // Clear invalid tokens
          window.location.href = "/login"; // Redirect to login
        }
      };
      getUserDetails();
    } else {
      // If no tokens are found at all, redirect to login
      removeToken(); // Ensure no partial tokens remain
      window.location.href = "/login";
    }
  }, []);

  // Monitor isProcessing state for debugging
  useEffect(() => {
    console.log("isProcessing changed to:", isProcessing);
  }, [isProcessing]);
  
  // Effect to handle long titles with scrolling animation and measure title lengths
  useEffect(() => {
    // Use setTimeout to ensure the DOM is fully rendered
    const timer = setTimeout(() => {
      const longTitleItems = document.querySelectorAll('.recent-chat-item-text');
      longTitleItems.forEach(item => {
        // Check if title is overflowing
        if (item.scrollWidth > item.clientWidth + 10) { // Add small buffer
          item.classList.add('long-title');
          
          // Check if title is very long
          if (item.scrollWidth > item.clientWidth * 2) {
            item.classList.add('very-long-title');
          } else {
            item.classList.remove('very-long-title');
          }
          
          // Calculate animation duration based on text length
          const textLength = item.textContent.length;
          const duration = Math.max(Math.min(textLength * 0.25, 25), 8); // Between 8-25s
          item.style.setProperty('--scroll-duration', `${duration}s`);
          
          // Add tooltip for hover preview
          const parent = item.closest('.recent-chat-item');
          if (parent) {
            parent.setAttribute('title', item.textContent);
            
            // Add a data attribute to show full text on hover if needed
            parent.dataset.fullText = item.textContent;
          }
        } else {
          item.classList.remove('long-title');
          item.classList.remove('very-long-title');
        }
      });
    }, 500); // Delay to ensure rendering is complete
    
    return () => clearTimeout(timer);
  }, [recentChats, showRecentChats]);

  return (
    <div className="chat-desktop">
      <div className="chat-content" style={{ display: isInConversation ? "none" : "block" }}>
        {/* Default Content */}
        <div className="chat-header">Hello, how can <br />I help you?</div>
        <div className="chat-input-section">
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              className="chat-input"
              type="text"
              placeholder="Ask a health question..."
              value={initialInputValue}
              onChange={(e) => handleInputChange(e, 'initial')}
              onKeyDown={handleKeyPress}
            />
            <button 
              className="send" 
              onClick={handleSend}
              type="button"
              aria-label="Send message"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1376F8, #00c6ff)',
                border: 'none',
                boxShadow: '0 3px 8px rgba(19, 118, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 5px 12px rgba(19, 118, 248, 0.6)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 8px rgba(19, 118, 248, 0.4)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <IoSend size={18} color="white" />
            </button>
          </div>
        </div>
        <div className="actions">
          <button className="action-button">Analyze Medical Report</button>
          <button className="action-button">Get Medical Advice</button>
          <button className="action-button">Health Tips</button>
          <button className="action-button">More</button>
        </div>
      </div>

      <div className="chat-content-conversation" style={{ display: isInConversation ? "block" : "none" }}>
        <>
          <div className="chat-window">
            {/* Add a loading indicator during message preprocessing */}
            {preprocessingMessages && (
              <div className="markdown-processing-indicator">
                <small>Processing response...</small>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={index} className={`message-wrapper ${msg.sender}`}>
                <div className={`message ${msg.sender === "user" ? "user" : "bot"} ${msg.isError ? "error" : ""}`}>
                {/* Show loading state if message is loading */}
                {msg.isLoading ? (
                  <MessageLoader text="AI is thinking..." />
                ) : (
                  /* Use only one ReactMarkdown instance with proper configuration */
                  <ReactMarkdown
                    children={msg?.text?.toString() || ''} /* Improved null/undefined safety */
                  remarkPlugins={[
                    [remarkGfm, { 
                      singleTilde: false,
                      tableCellPadding: true,
                      tablePipeAlign: true,
                      stringLength: () => 1
                    }], 
                    remarkBreaks
                  ]}
                  rehypePlugins={[
                    rehypeRaw, 
                    [rehypeSanitize, {
                      ...defaultSchema,
                      attributes: {
                        ...defaultSchema.attributes,
                        code: [...(defaultSchema.attributes?.code || []), 'className', 'data-language'],
                        span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
                        div: [...(defaultSchema.attributes?.div || []), 'className', 'style'],
                        table: [...(defaultSchema.attributes?.table || []), 'className'],
                        td: [...(defaultSchema.attributes?.td || []), 'align'],
                        th: [...(defaultSchema.attributes?.th || []), 'align'],
                        a: [...(defaultSchema.attributes?.a || []), 'target', 'rel']
                      },
                      tagNames: [
                        ...(defaultSchema.tagNames || []),
                        'div', 'span'
                      ]
                    }]
                  ]}
                  skipHtml={false}
                  urlTransform={url => url}
                  components={{
                    // Custom root wrapper to apply className
                    root: ({node, children, ...props}) => (
                      <div className={`markdown-content ${msg.sender === 'bot' ? 'bot-markdown' : 'user-markdown'}`}>
                        {children}
                      </div>
                    ),
                    // Add a table wrapper to handle overflow
                    table: ({node, children, ...props}) => (
                      <div className="table-container" key={`table-${props.key || Math.random()}`}>
                        <table className="md-table" {...props}>{children}</table>
                      </div>
                    ),
                    // Customize header rows with better styling
                    thead: ({node, children, ...props}) => <thead className="md-thead" key={`thead-${props.key || Math.random()}`} {...props}>{children}</thead>,
                    tbody: ({node, children, ...props}) => <tbody className="md-tbody" key={`tbody-${props.key || Math.random()}`} {...props}>{children}</tbody>,
                    tr: ({node, isHeader, children, ...props}) => 
                      <tr className={`md-tr ${isHeader ? 'md-header-row' : ''}`} key={`tr-${props.key || Math.random()}`} {...props}>{children}</tr>,
                    th: ({node, children, ...props}) => <th className="md-th" key={`th-${props.key || Math.random()}`} {...props}>{children}</th>,
                    td: ({node, children, ...props}) => <td className="md-td" key={`td-${props.key || Math.random()}`} {...props}>{children}</td>,
                    img: ({node, ...props}) => <img className="md-image" loading="lazy" key={`img-${props.src || Math.random()}`} {...props} />,
                    h1: ({node, children, ...props}) => <h1 className="md-heading md-h1" key={`h1-${props.key || Math.random()}`} {...props}>{children}</h1>,
                    h2: ({node, children, ...props}) => <h2 className="md-heading md-h2" key={`h2-${props.key || Math.random()}`} {...props}>{children}</h2>,
                    h3: ({node, children, ...props}) => <h3 className="md-heading md-h3" key={`h3-${props.key || Math.random()}`} {...props}>{children}</h3>,
                    h4: ({node, children, ...props}) => <h4 className="md-heading md-h4" key={`h4-${props.key || Math.random()}`} {...props}>{children}</h4>,
                    h5: ({node, children, ...props}) => <h5 className="md-heading md-h5" key={`h5-${props.key || Math.random()}`} {...props}>{children}</h5>,
                    h6: ({node, children, ...props}) => <h6 className="md-heading md-h6" key={`h6-${props.key || Math.random()}`} {...props}>{children}</h6>,
                    p: ({node, children, ...props}) => {
                      const key = `p-${props.key || Math.random()}`;
                      
                      // Check if children is empty or only contains whitespace
                      if (!children || (Array.isArray(children) && children.join('').trim() === '')) {
                        return <p className="md-paragraph md-empty-paragraph" key={key} {...props}>&nbsp;</p>;
                      }
                      
                      // If we have a single paragraph with special text (like headers or lists without proper markdown),
                      // try to detect and format it for better display
                      if (Array.isArray(children) && children.length > 0 && typeof children[0] === 'string') {
                        const text = children[0];
                        
                        // Check for common patterns that should be proper markdown
                        if (text.match(/^(#{1,6})\s+(.+)$/)) {
                          // This looks like a header but not in markdown format
                          const level = text.match(/^(#{1,6})/)[0].length;
                          const content = text.replace(/^#{1,6}\s+/, '');
                          const HeadingTag = `h${level}`;
                          return <HeadingTag className={`md-heading md-h${level}`} key={key} {...props}>{content}</HeadingTag>;
                        }
                        
                        if (text.match(/^[-*•]\s+(.+)$/)) {
                          // This looks like a bullet point but not in markdown format
                          const content = text.replace(/^[-*•]\s+/, '');
                          return (
                            <ul className="md-list md-unordered-list" key={key}>
                              <li className="md-list-item md-unordered-item">{content}</li>
                            </ul>
                          );
                        }
                        
                        // Check for numbered list patterns
                        if (text.match(/^\d+\.\s+(.+)$/)) {
                          // This looks like a numbered list item but not in markdown format
                          const content = text.replace(/^\d+\.\s+/, '');
                          return (
                            <ol className="md-list md-ordered-list" key={key}>
                              <li className="md-list-item md-ordered-item">{content}</li>
                            </ol>
                          );
                        }
                      }
                      
                      return <p className="md-paragraph" key={key} {...props}>{children}</p>;
                    },
                    ul: ({node, ordered, depth, children, ...props}) => 
                      <ul className={`md-list md-unordered-list md-depth-${depth || 0}`} key={`ul-${props.key || Math.random()}`} {...props}>{children}</ul>,
                    ol: ({node, ordered, depth, children, ...props}) => 
                      <ol className={`md-list md-ordered-list md-depth-${depth || 0}`} key={`ol-${props.key || Math.random()}`} {...props}>{children}</ol>,
                    li: ({node, ordered, checked, index, children, ...props}) => {
                      const listItemClass = `md-list-item ${checked !== null ? 'md-task-list-item' : ''} ${ordered ? 'md-ordered-item' : 'md-unordered-item'}`;
                      return <li className={listItemClass} key={`li-${props.key || index || Math.random()}`} {...props}>{children}</li>;
                    },
                    a: ({node, children, href, ...props}) => {
                      // Only add target="_blank" for external links
                      const isExternal = href?.startsWith('http') || href?.startsWith('https');
                      return (
                        <a 
                          className="md-link" 
                          href={href}
                          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          key={`a-${href || Math.random()}`}
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                    blockquote: ({node, children, ...props}) => <blockquote className="md-blockquote" key={`blockquote-${props.key || Math.random()}`} {...props}>{children}</blockquote>,
                    code: ({node, inline, className, children, ...props}) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeKey = `code-${props.key || Math.random()}`;
                      
                      return !inline && match ? (
                        <code 
                          className={`md-block-code md-code-${match[1]}`} 
                          data-language={match[1]}
                          key={codeKey}
                          {...props}
                        >
                          {Array.isArray(children) ? children.join('') : children}
                        </code>
                      ) : inline ? (
                        <code className="md-inline-code" key={codeKey} {...props}>
                          {Array.isArray(children) ? children.join('') : children}
                        </code>
                      ) : (
                        <code className="md-block-code" key={codeKey} {...props}>
                          {Array.isArray(children) ? children.join('') : children}
                        </code>
                      );
                    },
                    pre: ({node, children, ...props}) => (
                      <pre className="md-pre" key={`pre-${props.key || Math.random()}`} {...props}>
                        {children}
                      </pre>
                    ),
                    strong: ({node, children, ...props}) => (
                      <strong className="md-strong" key={`strong-${props.key || Math.random()}`} {...props}>
                        {children}
                      </strong>
                    ),
                    em: ({node, children, ...props}) => (
                      <em className="md-emphasis" key={`em-${props.key || Math.random()}`} {...props}>
                        {children}
                      </em>
                    ),
                    del: ({node, children, ...props}) => (
                      <del className="md-strikethrough" key={`del-${props.key || Math.random()}`} {...props}>
                        {children}
                      </del>
                    )
                  }}
                >
                </ReactMarkdown>
                )}
              </div>
            </div>
            ))}
          </div>
          <div className="chat-input-section">
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                className="chat-input"
                type="text"
                placeholder="Ask a health question..."
                value={conversationInputValue}
                onChange={(e) => handleInputChange(e, 'conversation')}
                onKeyDown={handleKeyPress}
              />
              <button 
                className="send" 
                onClick={handleSend}
                type="button"
                aria-label="Send message"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1376F8, #00c6ff)',
                  border: 'none',
                  boxShadow: '0 3px 8px rgba(19, 118, 248, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 5px 12px rgba(19, 118, 248, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(19, 118, 248, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <IoSend size={18} color="white" />
              </button>
            </div>
          </div>
        </>
      </div>

      <aside className={isSidebarActive ? "sidebar-active" : "sidebar-notactive"}>
        <div className="wrapper">
          <SafeImage className="logo" src="../assets/logo1.png" alt="Medical Chatbot Logo" />
          <SafeImage
            className="menu-icon"
            src="../assets/Hamburger.png"
            alt="Menu"
            onClick={toggleSidebar}
          />
        </div>
        <nav className="nav-options">
          <button 
            className={`nav-button ${isProcessing ? 'disabled' : ''}`} 
            onClick={handleNewChat}
            disabled={isProcessing}
          >
            <SafeImage src="../assets/Plus icon.png" alt="New Chat" />
            <span>New Chat</span>
          </button>
          <button className="nav-button" onClick={toggleRecentChats}>
            <SafeImage src="../assets/dropdown icon.png" alt="Recent Chats" />
            <span>Recent Chats</span>
          </button>
          {showRecentChats && (
            <div className="recent-chats">
              {recentChats.length === 0 ? (
                <p className="no-recent-chats">No recent chats</p>
              ) : (
                recentChats.map((chat, index) => (
                  <div 
                    key={`chat-${index}-${chat.timestamp || Date.now()}`} 
                    className={`recent-chat-item ${isProcessing ? 'disabled' : ''}`}
                    onClick={() => !isProcessing && loadChat(chat)}
                  >
                    <div className="recent-chat-item-text-wrapper">
                      <div className="recent-chat-item-text">
                        {chat.title}
                      </div>
                    </div>
                    <div className="recent-chat-item-time">
                      {(() => {
                        const date = new Date(chat.timestamp);
                        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </nav>
        <button 
          className="nav-button logout-button" 
          onClick={handleLogout}
        >
          <FiLogOut size={20} />
          <span>Logout</span>
        </button>
        
        <div className="user-info">
          <div className="profile-avatar-container">
            {avatarUrl ? (
              <img src={avatarUrl} alt="User Avatar" className="profile-avatar-image" />
            ) : (
              <div className="profile-avatar-letter">{userName.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="welcome-text">
            <p>Welcome back,</p>
            <strong>{userName}</strong>
          </div>
        </div>
      </aside>
      <footer className="footer-text">
        Your privacy is our priority. All interactions are secure and confidential.
      </footer>
    </div>
  );
};

export default ChatPage;
