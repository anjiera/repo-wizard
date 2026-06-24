import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

const originalFetch = global.fetch;

describe('App Component Workflow', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ reports: [] })
      })
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });
  it('renders landing page options correctly', async () => {
    render(<App />);
    expect(screen.getByText(/Repo Wizard Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/start new alignment audit/i)).toBeInTheDocument();
    expect(screen.getByText(/resume previous setup/i)).toBeInTheDocument();
    await screen.findByText(/View Existing Reports \(0\)/i);
  });

  it('can navigate to target picker and questionnaire steps', async () => {
    render(<App />);

    // Click "Start New Interview"
    const startBtn = screen.getByRole('button', { name: /start new interview/i });
    fireEvent.click(startBtn);

    // Expect Target Picker screen
    expect(screen.getByRole('heading', { name: /select target codebase/i })).toBeInTheDocument();
    
    // Type path
    const input = screen.getByPlaceholderText(/e.g. c:\/projects\/my-app/i);
    fireEvent.change(input, { target: { value: 'D:/TestWorkspace/app' } });

    // Click "Configure & Audit"
    const submitBtn = screen.getByRole('button', { name: /configure & audit/i });
    fireEvent.click(submitBtn);

    // Wait for the async state change (fetch completion) to move to the questionnaire screen
    const heading = await screen.findByRole('heading', { name: /context & goals/i });
    expect(heading).toBeInTheDocument();
    
    // Click "Next Step"
    const nextBtn = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn);

    // Expect Questionnaire Step 2 (Technical Stack)
    expect(screen.getByRole('heading', { name: /technical stack/i })).toBeInTheDocument();
  });
});
