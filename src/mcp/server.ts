#!/usr/bin/env node

/**
 * MCP Server Entry Point for DevOps AI Toolkit
 * 
 * This server exposes DevOps AI Toolkit functionality through the Model Context Protocol,
 * enabling AI assistants like Claude Code to interact with Kubernetes deployment capabilities.
 */

import { MCPServer } from '../interfaces/mcp.js';
import { DotAI } from '../core/index.js';

async function main() {
  try {
    // Validate required environment variables
    process.stderr.write('Validating MCP server configuration...\n');
    
    // Check session directory configuration
    const sessionDir = process.env.DOT_AI_SESSION_DIR;
    if (!sessionDir) {
      process.stderr.write('FATAL: DOT_AI_SESSION_DIR environment variable is required\n');
      process.stderr.write('Configuration:\n');
      process.stderr.write('- Set DOT_AI_SESSION_DIR in .mcp.json env section\n');
      process.stderr.write('- Example: "DOT_AI_SESSION_DIR": "/tmp/dot-ai-sessions"\n');
      process.stderr.write('- Ensure the directory exists and is writable\n');
      process.exit(1);
    }
    
    // Validate session directory exists and is writable
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Check if directory exists
      if (!fs.existsSync(sessionDir)) {
        process.stderr.write(`FATAL: Session directory does not exist: ${sessionDir}\n`);
        process.stderr.write('Solution: Create the directory or update DOT_AI_SESSION_DIR\n');
        process.exit(1);
      }
      
      // Check if it's actually a directory
      const stat = fs.statSync(sessionDir);
      if (!stat.isDirectory()) {
        process.stderr.write(`FATAL: Session directory path is not a directory: ${sessionDir}\n`);
        process.stderr.write('Solution: Use a valid directory path in DOT_AI_SESSION_DIR\n');
        process.exit(1);
      }
      
      // Test write permissions
      const testFile = path.join(sessionDir, '.mcp-test-write');
      try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        process.stderr.write(`Session directory validated: ${sessionDir}\n`);
      } catch (writeError) {
        process.stderr.write(`FATAL: Session directory is not writable: ${sessionDir}\n`);
        process.stderr.write('Solution: Fix directory permissions or use a different directory\n');
        process.exit(1);
      }
      
    } catch (error) {
      process.stderr.write(`FATAL: Session directory validation failed: ${error}\n`);
      process.exit(1);
    }

    // Initialize DotAI - it will read KUBECONFIG and ANTHROPIC_API_KEY from environment
    const dotAI = new DotAI();

    // Initialize without cluster connection (lazy connection)
    process.stderr.write('Initializing DevOps AI Toolkit...\n');
    try {
      await dotAI.initializeWithoutCluster();
      process.stderr.write('DevOps AI Toolkit initialized successfully\n');
      process.stderr.write('Cluster connectivity will be checked when needed by individual tools\n');
    } catch (initError) {
      process.stderr.write(`FATAL: Failed to initialize DevOps AI Toolkit: ${initError}\n`);
      process.exit(1);
    }

    // Create and configure MCP server
    const mcpServer = new MCPServer(dotAI, {
      name: 'dot-ai',
      version: '0.1.0',
      description: 'Universal Kubernetes application deployment agent with AI-powered orchestration',
      author: 'Viktor Farcic'
    });

    // Start the MCP server
    process.stderr.write('Starting DevOps AI Toolkit MCP server...\n');
    await mcpServer.start();
    process.stderr.write('DevOps AI Toolkit MCP server started successfully\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      process.stderr.write('Shutting down DevOps AI Toolkit MCP server...\n');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      process.stderr.write('Shutting down DevOps AI Toolkit MCP server...\n');
      await mcpServer.stop();
      process.exit(0);
    });

  } catch (error) {
    process.stderr.write(`Failed to start DevOps AI Toolkit MCP server: ${error}\n`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  process.stderr.write(`Uncaught exception in MCP server: ${error}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  process.stderr.write(`Unhandled rejection in MCP server: ${reason}\n`);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  process.stderr.write(`Fatal error starting MCP server: ${error}\n`);
  process.exit(1);
});