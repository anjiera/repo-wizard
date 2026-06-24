import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

const originalFetch = global.fetch;

describe('App Component Workflow', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/consent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ consented: true, data: { agreed: true } })
        });
      }
      if (url.includes('/api/reports')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ reports: [] })
        });
      }
      if (url.includes('/api/session')) {
        // Return a 200 OK to indicate an active session exists
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            targetPath: '',
            status: 'paused',
            currentStep: 0,
            answers: { compliance: [] },
            sections: {}
          })
        });
      }
      if (url.includes('/api/scan-logs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ logs: ['[Mock] Scan log entry'], isScanning: false })
        });
      }
      if (url.includes('/api/scan')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success' })
        });
      }
      if (url.includes('/api/analyze-target')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', warnings: ['Mock warning: Language mismatch detected.'] })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
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

  it('renders consent page if not consented and allows acceptance', async () => {
    // Override fetch to mock unconsented status
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/consent')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ consented: false })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ reports: [] })
      });
    });

    render(<App />);

    // Expect Consent screen terms and accept button
    const heading = await screen.findByText(/Terms of Service & Developer Consent/i);
    expect(heading).toBeInTheDocument();
    const acceptBtn = screen.getByRole('button', { name: /i accept the terms/i });
    
    // Accept consent
    fireEvent.click(acceptBtn);

    // After accepting, it transitions to landing screen
    await screen.findByText(/start new alignment audit/i);
  });
});
