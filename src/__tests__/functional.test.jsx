import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

if (typeof window !== 'undefined') {
  window.scrollTo = vi.fn();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Helper to strip motion props to avoid animation timer cancellations and React DOM warnings in happy-dom
const filterMotionProps = ({
  whileHover: _wh,
  whileTap: _wt,
  whileInView: _wiv,
  initial: _init,
  animate: _anim,
  exit: _ex,
  transition: _tr,
  viewport: _vp,
  ...props
}) => props;

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }) => <button {...filterMotionProps(props)}>{children}</button>,
    h1: ({ children, ...props }) => <h1 {...filterMotionProps(props)}>{children}</h1>,
    h2: ({ children, ...props }) => <h2 {...filterMotionProps(props)}>{children}</h2>,
    p: ({ children, ...props }) => <p {...filterMotionProps(props)}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock Firebase Config & Modules
vi.mock('../firebaseConfig.js', () => ({
  auth: { currentUser: { uid: 'test-user-123', email: 'test@nutriscan.ai', displayName: 'Test User' } },
  db: {},
  APP_ID: 'nutriscan-ai',
  googleProvider: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  setDoc: vi.fn().mockResolvedValue(true),
  deleteDoc: vi.fn().mockResolvedValue(true),
  collection: vi.fn(() => ({ id: 'mock-collection' })),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  signOut: vi.fn().mockResolvedValue(true),
  updateProfile: vi.fn().mockResolvedValue(true),
  signInWithEmailAndPassword: vi.fn().mockResolvedValue(true),
  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({ user: {} }),
  signInWithPopup: vi.fn().mockResolvedValue(true),
  signInWithPhoneNumber: vi.fn().mockResolvedValue({}),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  RecaptchaVerifier: vi.fn(),
}));

vi.mock('../services/gemini.js', () => ({
  sendChatMessageAI: vi.fn().mockResolvedValue('Here is **nutrition advice**:\n• Eat fresh fruits\n• Drink water'),
  analyzeProductAI: vi.fn().mockResolvedValue({
    name: 'Organic Granola',
    healthGrade: 'A',
    summary: 'High fiber whole grains',
    ingredients: [{ name: 'Oats', type: 'Natural', risk: 'None', classification: 'safe' }],
    alternatives: [{ name: 'Steel Cut Oats', reason: 'Lower GI' }],
  }),
  analyzeFoodNutritionAI: vi.fn().mockImplementation((foodName, serving) => Promise.resolve({
    name: foodName || 'Avocado Toast',
    healthGrade: 'A',
    summary: 'Rich in healthy fats and fiber',
    ingredients: [{ name: 'Avocado', type: 'Natural', risk: 'None', classification: 'safe' }],
    nutrition: {
      serving: serving || '100 grams',
      calories: serving && String(serving).includes('200') ? 480 : 240,
      protein: serving && String(serving).includes('200') ? 12 : 6,
      carbs: serving && String(serving).includes('200') ? 44 : 22,
      fat: serving && String(serving).includes('200') ? 28 : 14,
      sodium: '190mg',
    },
    alternatives: [{ name: 'Rye Bread Toast', reason: 'Higher fiber' }],
  })),
  identifyFoodItemsAI: vi.fn().mockResolvedValue(['Avocado Toast', 'Boiled Egg']),
  getAIInsightAI: vi.fn().mockImplementation((_food, type) => {
    if (type === 'recipe') return Promise.resolve('Recipe Idea: Toast whole wheat sourdough and spread mashed avocado.');
    return Promise.resolve('Great meal balance! Consider adding a pinch of chia seeds.');
  }),
}));

import { setDoc, deleteDoc, addDoc, getDocs } from 'firebase/firestore';
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { sendChatMessageAI } from '../services/gemini.js';

import HomePage from '../components/HomePage.jsx';
import ProductDetailsPage from '../components/ProductDetailsPage.jsx';
import NutritionAnalysisPage from '../components/NutritionAnalysisPage.jsx';
import BlogPage from '../components/BlogPage.jsx';
import ChatbotInterface from '../components/ChatbotInterface.jsx';
import UserProfilePage from '../components/UserProfilePage.jsx';
import AuthModal from '../components/Modals.jsx';
import App from '../App.jsx';
import { GradeBadge, IngredientRow, NutritionCard } from '../components/Shared.jsx';

describe('Functional Tests: HomePage', () => {
  it('renders hero title and default category Packaged Foods', () => {
    render(<HomePage onNavigate={() => {}} />);
    expect(screen.getByText('Analyze Your')).toBeDefined();
    expect(screen.getByText('Packaged Foods')).toBeDefined();
    expect(screen.getByPlaceholderText('Search for biscuits, chips, noodles...')).toBeDefined();
  });

  it('switches categories and updates search input placeholder', () => {
    render(<HomePage onNavigate={() => {}} />);
    
    // Switch to Personal Care
    const careBtn = screen.getByText('Personal Care');
    fireEvent.click(careBtn);
    expect(screen.getByPlaceholderText('Search for shampoo, lotion, creams...')).toBeDefined();

    // Switch to Health Products
    const healthBtn = screen.getByText('Health Products');
    fireEvent.click(healthBtn);
    expect(screen.getByPlaceholderText('Search for supplements, vitamins...')).toBeDefined();
  });

  it('prevents search navigation when query is empty or only whitespace', () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} />);
    
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Product/i });
    expect(analyzeBtn.disabled).toBe(true);

    fireEvent.click(analyzeBtn);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('triggers search navigation on button click and Enter key when query is provided', () => {
    const onNavigate = vi.fn();
    render(<HomePage onNavigate={onNavigate} />);
    
    const input = screen.getByPlaceholderText('Search for biscuits, chips, noodles...');
    fireEvent.change(input, { target: { value: 'Organic Green Tea' } });
    
    const analyzeBtn = screen.getByRole('button', { name: /Analyze Product/i });
    expect(analyzeBtn.disabled).toBe(false);

    fireEvent.click(analyzeBtn);
    expect(onNavigate).toHaveBeenCalledWith('details', { query: 'Organic Green Tea', type: 'foods' });

    // Test Enter key
    fireEvent.change(input, { target: { value: 'Almond Milk' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('details', { query: 'Almond Milk', type: 'foods' });
  });

  it('clears query when clicking the X button', () => {
    render(<HomePage onNavigate={() => {}} />);
    const input = screen.getByPlaceholderText('Search for biscuits, chips, noodles...');
    fireEvent.change(input, { target: { value: 'Biscuits' } });
    expect(input.value).toBe('Biscuits');

    const clearBtn = screen.getByLabelText('Clear search query');
    fireEvent.click(clearBtn);
    expect(input.value).toBe('');
  });
});

describe('Functional Tests: ProductDetailsPage', () => {
  it('renders product details, health grade, ingredients, and alternatives', async () => {
    const onNavigate = vi.fn();
    const data = { query: 'Organic Granola', type: 'foods' };
    render(<ProductDetailsPage data={data} onNavigate={onNavigate} user={null} />);

    await waitFor(() => {
      const names = screen.getAllByText('Organic Granola');
      expect(names.length).toBeGreaterThan(0);
      expect(screen.getByText('High fiber whole grains')).toBeDefined();
      expect(screen.getByText('Oats')).toBeDefined();
      expect(screen.getByText('Steel Cut Oats')).toBeDefined();
    });
  });

  it('handles back button navigation to home', async () => {
    const onNavigate = vi.fn();
    const data = { query: 'Organic Granola', type: 'foods' };
    render(<ProductDetailsPage data={data} onNavigate={onNavigate} user={null} />);

    await waitFor(() => {
      const names = screen.getAllByText('Organic Granola');
      expect(names.length).toBeGreaterThan(0);
    });

    const backBtn = screen.getByLabelText('Back to home search');
    fireEvent.click(backBtn);
    expect(onNavigate).toHaveBeenCalledWith('home');
  });

  it('toggles product bookmark and persists to Firestore setDoc when user is logged in', async () => {
    const user = { uid: 'u-1', email: 'alex@example.com' };
    const data = { query: 'Organic Granola', type: 'foods' };
    render(<ProductDetailsPage data={data} onNavigate={() => {}} user={user} />);

    await waitFor(() => {
      const names = screen.getAllByText('Organic Granola');
      expect(names.length).toBeGreaterThan(0);
    });

    const bookmarkBtn = screen.getByLabelText('Save product to profile');
    fireEvent.click(bookmarkBtn);

    // After clicking, label should change to remove and setDoc should be called
    expect(screen.getByLabelText('Remove from saved products')).toBeDefined();
    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });

    // Clicking again should call deleteDoc
    fireEvent.click(screen.getByLabelText('Remove from saved products'));
    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  it('handles bookmark toggle locally without error when user is null', async () => {
    const data = { query: 'Organic Granola', type: 'foods' };
    render(<ProductDetailsPage data={data} onNavigate={() => {}} user={null} />);

    await waitFor(() => {
      const names = screen.getAllByText('Organic Granola');
      expect(names.length).toBeGreaterThan(0);
    });

    const bookmarkBtn = screen.getByLabelText('Save product to profile');
    fireEvent.click(bookmarkBtn);

    expect(screen.getByLabelText('Remove from saved products')).toBeDefined();
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe('Functional Tests: NutritionAnalysisPage', () => {
  it('renders heading and toggles paste URL input', () => {
    render(<NutritionAnalysisPage user={null} onNavigate={() => {}} />);
    expect(screen.getByText(/Calories Analysis/i)).toBeDefined();

    const urlBtn = screen.getByRole('button', { name: /Paste URL/i });
    fireEvent.click(urlBtn);

    expect(screen.getByPlaceholderText('Paste food/recipe URL here...')).toBeDefined();
  });

  it('analyzes food on query submit and displays nutrition cards', async () => {
    render(<NutritionAnalysisPage user={null} onNavigate={() => {}} />);

    const input = screen.getByPlaceholderText('Enter food name, e.g. Masala Dosa, Biryani, Idli...');
    fireEvent.change(input, { target: { value: 'Avocado Toast' } });

    const analyzeBtn = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(screen.getByText('Avocado Toast')).toBeDefined();
      expect(screen.getByText('240')).toBeDefined(); // Calories
      expect(screen.getByText('6g')).toBeDefined();  // Protein
      expect(screen.getByText('22g')).toBeDefined(); // Carbs
    });
  });

  it('recalculates nutrition metrics when serving size is modified', async () => {
    render(<NutritionAnalysisPage user={null} onNavigate={() => {}} />);

    const input = screen.getByPlaceholderText('Enter food name, e.g. Masala Dosa, Biryani, Idli...');
    fireEvent.change(input, { target: { value: 'Avocado Toast' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Avocado Toast')).toBeDefined();
      expect(screen.getByText('240')).toBeDefined();
    });

    // Change serving to 200
    const servingInput = screen.getByDisplayValue('100');
    fireEvent.change(servingInput, { target: { value: '200' } });

    const recalcBtn = screen.getByRole('button', { name: /Recalculate/i });
    fireEvent.click(recalcBtn);

    await waitFor(() => {
      expect(screen.getByText('480')).toBeDefined();
      expect(screen.getByText('12g')).toBeDefined();
    });
  });

  it('generates AI coach insight and recipe idea', async () => {
    render(<NutritionAnalysisPage user={null} onNavigate={() => {}} />);

    const input = screen.getByPlaceholderText('Enter food name, e.g. Masala Dosa, Biryani, Idli...');
    fireEvent.change(input, { target: { value: 'Avocado Toast' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Avocado Toast')).toBeDefined();
    });

    // Test AI Coach
    const coachBtn = screen.getByRole('button', { name: /AI Health Coach/i });
    fireEvent.click(coachBtn);

    await waitFor(() => {
      expect(screen.getByText(/Great meal balance! Consider adding a pinch of chia seeds/i)).toBeDefined();
    });

    // Test Recipe Idea
    const recipeBtn = screen.getByRole('button', { name: /Recipe Idea/i });
    fireEvent.click(recipeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Recipe Idea: Toast whole wheat sourdough/i)).toBeDefined();
    });
  });

  it('logs scan history when authenticated user runs analysis', async () => {
    const user = { uid: 'user-auth-123', email: 'test@nutriscan.ai' };
    render(<NutritionAnalysisPage user={user} onNavigate={() => {}} />);

    const input = screen.getByPlaceholderText('Enter food name, e.g. Masala Dosa, Biryani, Idli...');
    fireEvent.change(input, { target: { value: 'Avocado Toast' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

    await waitFor(() => {
      expect(screen.getByText('Avocado Toast')).toBeDefined();
      expect(addDoc).toHaveBeenCalled();
    });
  });
});

describe('Functional Tests: BlogPage & Newsletter Flow', () => {
  it('renders all blog articles and featured article', () => {
    render(<BlogPage onNavigate={() => {}} />);
    expect(screen.getByText('Understanding Food Labels in India')).toBeDefined();
    expect(screen.getByText("The Truth About 'Sugar-Free' Claims")).toBeDefined();
    expect(screen.getByText('Navigating Personal Care Ingredients')).toBeDefined();
  });

  it('opens article detail modal on clicking Read More, and closes modal', () => {
    render(<BlogPage onNavigate={() => {}} />);
    
    const readMoreBtns = screen.getAllByRole('button', { name: /Read More/i });
    fireEvent.click(readMoreBtns[0]);

    // Modal should now be visible with story content
    expect(screen.getByText(/Key things to check on Indian food labels/i)).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close Article/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Key things to check on Indian food labels/i)).toBeNull();
  });

  it('validates newsletter form: rejects invalid email and accepts valid email with success message', () => {
    render(<BlogPage onNavigate={() => {}} />);
    
    const input = screen.getByPlaceholderText('Your email address');
    const form = input.closest('form');

    // Invalid email
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);
    expect(screen.getByText('Please enter a valid email address.')).toBeDefined();

    // Valid email
    fireEvent.change(input, { target: { value: 'reader@example.com' } });
    fireEvent.submit(form);
    expect(screen.getByText(/You're subscribed! Welcome to our wellness community/i)).toBeDefined();
  });
});

describe('Functional Tests: ChatbotInterface', () => {
  it('renders lock notice and disables sending when user is not authenticated', () => {
    const onAuthRequest = vi.fn();
    render(<ChatbotInterface user={null} onAuthRequest={onAuthRequest} />);
    
    expect(screen.getByText('Sign in to send messages and save your chat history.')).toBeDefined();
    
    // Clicking suggested question chip triggers onAuthRequest
    const chip = screen.getByText('Is Maggi noodles healthy?');
    fireEvent.click(chip);
    expect(onAuthRequest).toHaveBeenCalled();
  });

  it('enables chat input and formats AI markdown when user is authenticated', async () => {
    const user = { uid: 'user-1', email: 'alex@example.com' };
    render(<ChatbotInterface user={user} onAuthRequest={() => {}} />);

    const input = screen.getByPlaceholderText('Type your question here…');
    expect(input.disabled).toBe(false);

    fireEvent.change(input, { target: { value: 'How much water should I drink?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // User message should appear
    expect(screen.getByText('How much water should I drink?')).toBeDefined();

    // Formatted AI message should appear after mock resolves
    await waitFor(() => {
      expect(screen.getByText('nutrition advice')).toBeDefined();
      expect(screen.getByText('Eat fresh fruits')).toBeDefined();
    });
  });

  it('sends message via send button click', async () => {
    const user = { uid: 'user-1', email: 'alex@example.com' };
    render(<ChatbotInterface user={user} onAuthRequest={() => {}} />);

    const input = screen.getByPlaceholderText('Type your question here…');
    fireEvent.change(input, { target: { value: 'Tell me about chia seeds' } });

    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn.disabled).toBe(false);
    fireEvent.click(sendBtn);

    expect(screen.getByText('Tell me about chia seeds')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('nutrition advice')).toBeDefined();
    });
  });

  it('displays friendly error message when AI call fails', async () => {
    sendChatMessageAI.mockRejectedValueOnce(new Error('Network service unreachable'));
    const user = { uid: 'user-1', email: 'alex@example.com' };
    render(<ChatbotInterface user={user} onAuthRequest={() => {}} />);

    const input = screen.getByPlaceholderText('Type your question here…');
    fireEvent.change(input, { target: { value: 'Trigger network error' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/Network service unreachable/i)).toBeDefined();
    });
  });
});

describe('Functional Tests: UserProfilePage', () => {
  it('renders sign-in prompt when user is not logged in', () => {
    const onAuthRequest = vi.fn();
    render(<UserProfilePage user={null} onAuthRequest={onAuthRequest} onSignOut={() => {}} />);
    
    expect(screen.getByText('Sign in to view your profile')).toBeDefined();
    const btn = screen.getByRole('button', { name: /Sign In \/ Create Account/i });
    fireEvent.click(btn);
    expect(onAuthRequest).toHaveBeenCalled();
  });

  it('renders user details, stats, and handles edit profile mode', () => {
    const user = { displayName: 'John Doe', email: 'john@example.com', uid: '123' };
    render(<UserProfilePage user={user} onAuthRequest={() => {}} onSignOut={() => {}} />);
    
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Products Scanned')).toBeDefined();
    expect(screen.getByText('Saved Products')).toBeDefined();

    // Enter edit mode
    const editBtn = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    const nameInput = screen.getByLabelText('Display name');
    expect(nameInput.value).toBe('John Doe');

    // Cancel edit
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByLabelText('Display name')).toBeNull();
  });

  it('saves updated display name through Firebase updateProfile', async () => {
    const user = { displayName: 'John Doe', email: 'john@example.com', uid: '123' };
    render(<UserProfilePage user={user} onAuthRequest={() => {}} onSignOut={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));
    const nameInput = screen.getByLabelText('Display name');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(user, { displayName: 'Jane Doe' });
    });
  });

  it('renders saved products and recent scans from Firestore and triggers navigation', async () => {
    getDocs.mockImplementation(() => {
      // Return docs based on query
      return Promise.resolve({
        docs: [
          {
            id: 'mock-item-1',
            data: () => ({ name: 'Almond Butter', healthGrade: 'A', type: 'foods' }),
          },
        ],
      });
    });

    const user = { displayName: 'John Doe', email: 'john@example.com', uid: '123' };
    const onNavigate = vi.fn();
    render(<UserProfilePage user={user} onAuthRequest={() => {}} onSignOut={() => {}} onNavigate={onNavigate} />);

    await waitFor(() => {
      const items = screen.getAllByText('Almond Butter');
      expect(items.length).toBeGreaterThan(0);
    });

    // Click on saved product card
    const productCard = screen.getAllByText('Almond Butter')[0].closest('div');
    fireEvent.click(productCard);
    expect(onNavigate).toHaveBeenCalledWith('details', { query: 'Almond Butter', type: 'foods' });
  });

  it('calls onSignOut when clicking sign out button', () => {
    const user = { displayName: 'John Doe', email: 'john@example.com', uid: '123' };
    const onSignOut = vi.fn();
    render(<UserProfilePage user={user} onAuthRequest={() => {}} onSignOut={onSignOut} />);

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    fireEvent.click(signOutBtn);
    expect(onSignOut).toHaveBeenCalled();
  });
});

describe('Functional Tests: AuthModal Flow & Forgot Password', () => {
  it('does not render dialog when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders login form and switches between signup and phone modes', () => {
    render(<AuthModal isOpen={true} onClose={() => {}} initialMode="login" />);
    
    expect(screen.getByText('Welcome back')).toBeDefined();
    expect(screen.getByPlaceholderText('Email address')).toBeDefined();
    expect(screen.getByPlaceholderText('Password')).toBeDefined();

    // Switch to Sign up mode
    const signUpBtn = screen.getByRole('button', { name: 'Sign up' });
    fireEvent.click(signUpBtn);
    expect(screen.getByText('Create account')).toBeDefined();
    expect(screen.getByPlaceholderText('Display name')).toBeDefined();

    // Switch to Phone mode
    const phoneBtn = screen.getByRole('button', { name: /Phone/i });
    fireEvent.click(phoneBtn);
    expect(screen.getByText('Phone sign-in')).toBeDefined();
    expect(screen.getByPlaceholderText('+91 98765 43210')).toBeDefined();

    // Switch back to email
    const emailSwitchBtn = screen.getByRole('button', { name: 'Use email instead' });
    fireEvent.click(emailSwitchBtn);
    expect(screen.getByText('Welcome back')).toBeDefined();
  });

  it('switches to forgot password mode, sends reset link, and shows confirmation', async () => {
    render(<AuthModal isOpen={true} onClose={() => {}} initialMode="login" />);

    // Click Forgot password link
    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i });
    fireEvent.click(forgotBtn);

    expect(screen.getByText('Reset password')).toBeDefined();
    const emailInput = screen.getByPlaceholderText('Enter your registered email');
    fireEvent.change(emailInput, { target: { value: 'user@nutriscan.ai' } });

    const sendBtn = screen.getByRole('button', { name: /Send Reset Link/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalled();
      expect(screen.getByText(/Password reset link sent! Please check your email inbox/i)).toBeDefined();
    });

    // Switch back to sign in
    const backBtn = screen.getByRole('button', { name: /Back to sign in/i });
    fireEvent.click(backBtn);
    expect(screen.getByText('Welcome back')).toBeDefined();
  });

  it('handles error in password reset with friendly message', async () => {
    sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    render(<AuthModal isOpen={true} onClose={() => {}} initialMode="forgot" />);

    const emailInput = screen.getByPlaceholderText('Enter your registered email');
    fireEvent.change(emailInput, { target: { value: 'missing@nutriscan.ai' } });

    const sendBtn = screen.getByRole('button', { name: /Send Reset Link/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('No account found with this email.')).toBeDefined();
    });
  });

  it('toggles password visibility on clicking eye icon', () => {
    render(<AuthModal isOpen={true} onClose={() => {}} initialMode="login" />);
    
    const passInput = screen.getByPlaceholderText('Password');
    expect(passInput.type).toBe('password');

    const toggleBtn = screen.getByLabelText('Show password');
    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe('text');

    const hideBtn = screen.getByLabelText('Hide password');
    fireEvent.click(hideBtn);
    expect(passInput.type).toBe('password');
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} />);
    
    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Functional Tests: App Shell & Routing Navigation', () => {
  it('renders brand header and default home page view', () => {
    render(<App />);
    expect(screen.getByText('NutriScan')).toBeDefined();
    expect(screen.getByText('Analyze Your')).toBeDefined();
    expect(screen.getByRole('button', { name: /Login/i })).toBeDefined();
  });

  it('navigates between header tabs (Calories Analysis, Blog, Chatbot, Products)', async () => {
    render(<App />);

    // Click Calories Analysis in desktop header
    const analysisNavBtn = screen.getByRole('button', { name: 'Calories Analysis' });
    fireEvent.click(analysisNavBtn);

    await waitFor(() => {
      expect(screen.getByText(/Calories Analysis/i)).toBeDefined();
    });

    // Click Blog
    const blogNavBtn = screen.getByRole('button', { name: 'Blog' });
    fireEvent.click(blogNavBtn);

    await waitFor(() => {
      expect(screen.getByText('Understanding Food Labels in India')).toBeDefined();
    });

    // Click Chatbot
    const chatNavBtn = screen.getByRole('button', { name: 'Chatbot' });
    fireEvent.click(chatNavBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/NutriScan Assistant/i).length).toBeGreaterThan(0);
    });

    // Return to Products (Home)
    const homeNavBtn = screen.getByRole('button', { name: 'Products' });
    fireEvent.click(homeNavBtn);

    await waitFor(() => {
      expect(screen.getByText('Analyze Your')).toBeDefined();
    });
  });

  it('opens and closes AuthModal when clicking Login button in header', async () => {
    render(<App />);

    const loginBtn = screen.getByRole('button', { name: /Login/i });
    fireEvent.click(loginBtn);

    expect(screen.getByText('Welcome back')).toBeDefined();

    const closeBtn = screen.getByLabelText('Close dialog');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Welcome back')).toBeNull();
    });
  });
});

describe('Functional Tests: Shared Component Units', () => {
  it('renders GradeBadge with proper letter and semantic health label', () => {
    const { rerender } = render(<GradeBadge grade="A" size={60} />);
    expect(screen.getByText('A')).toBeDefined();
    expect(screen.getByText('Excellent')).toBeDefined();

    rerender(<GradeBadge grade="F" size={60} />);
    expect(screen.getByText('F')).toBeDefined();
    expect(screen.getByText('Harmful')).toBeDefined();
  });

  it('renders IngredientRow with type tag and classification badge', () => {
    const ingredient = {
      name: 'Sodium Benzoate',
      type: 'Artificial',
      risk: 'Potential preservative allergen',
      classification: 'limited',
    };
    render(<IngredientRow ingredient={ingredient} index={0} />);
    expect(screen.getByText('Sodium Benzoate')).toBeDefined();
    expect(screen.getByText('Artificial')).toBeDefined();
    expect(screen.getByText('limited')).toBeDefined();
  });

  it('renders NutritionCard with metric values and labels', () => {
    render(<NutritionCard label="Protein" value="18g" unit="grams" color="#27AE60" />);
    expect(screen.getByText('Protein')).toBeDefined();
    expect(screen.getByText('18g')).toBeDefined();
    expect(screen.getByText('grams')).toBeDefined();
  });
});
