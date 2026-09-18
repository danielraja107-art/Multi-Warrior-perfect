import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/useGameStore';
import { StormEffect } from './components/StormEffect';
import { Modal } from './components/Modal';

interface MenuItem {
  id: string;
  label: string;
  action: () => void;
  primary?: boolean;
}

export function MainMenu() {
  const navigate = useNavigate();
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated);
  const username = useGameStore((s) => s.auth.username);
  const logout = useGameStore((s) => s.logout);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [friendsMenuIndex, setFriendsMenuIndex] = useState(0);
  const menuRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const friendsRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const primaryActions = useCallback(() => {
    setShowFriends(true);
    setFriendsMenuIndex(0);
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'friends', label: 'Play With Friends', action: primaryActions },
    { id: 'create', label: 'Create Room', action: () => navigate('/create-room') },
    { id: 'join', label: 'Join Room', action: () => navigate('/join-room') },
    {
      id: 'profile',
      label: 'Profile',
      action: () => navigate(isAuthenticated ? '/profile' : '/login'),
    },
    { id: 'settings', label: 'Settings', action: () => navigate('/settings') },
  ];

  const friendsItems = [
    { id: 'f-create', label: 'Create a New Room', action: () => navigate('/create-room') },
    { id: 'f-join', label: 'Join with a Code', action: () => navigate('/join-room') },
  ];

  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleMenuKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFocusedIndex((index + 1) % menuItems.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedIndex((index - 1 + menuItems.length) % menuItems.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        menuItems[index].action();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(menuItems.length - 1);
        break;
    }
  };

  const handleFriendsKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setFriendsMenuIndex((index + 1) % friendsItems.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setFriendsMenuIndex((index - 1 + friendsItems.length) % friendsItems.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        friendsItems[index].action();
        break;
      case 'Escape':
        e.preventDefault();
        setShowFriends(false);
        break;
    }
  };

  useEffect(() => {
    if (focusedIndex >= 0 && menuRefs.current[menuItems[focusedIndex].id]) {
      menuRefs.current[menuItems[focusedIndex].id]?.focus();
    }
  }, [focusedIndex, menuItems]);

  useEffect(() => {
    if (showFriends) {
      const timeout = setTimeout(() => {
        friendsRefs.current[friendsItems[friendsMenuIndex].id]?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [showFriends, friendsMenuIndex, friendsItems]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFriends) {
        setShowFriends(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showFriends]);

  const renderButton = (item: MenuItem, index: number) => {
    const btnClass = item.primary ? 'btn-primary' : 'btn-secondary';
    const isHovered = hoveredButton === item.id;
    return (
      <button
        key={item.id}
        ref={(el) => {
          menuRefs.current[item.id] = el;
        }}
        className={`${btnClass} relative overflow-hidden group`}
        onClick={item.action}
        onMouseEnter={() => setHoveredButton(item.id)}
        onMouseLeave={() => setHoveredButton(null)}
        onFocus={() => setFocusedIndex(index)}
        onKeyDown={(e) => handleMenuKeyDown(e, index)}
        tabIndex={focusedIndex === index ? 0 : -1}
        aria-label={item.label}
      >
        <span className="relative z-10">{item.label}</span>
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            item.primary
              ? 'from-accent-fire/0 via-accent-fire/20 to-accent-fire/0'
              : 'from-storm-400/0 via-storm-400/20 to-storm-400/0'
          } transition-transform duration-500 ${isHovered ? 'translate-x-0' : '-translate-x-full'}`}
        />
      </button>
    );
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <StormEffect intensity="medium" showRain showLightning />

      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <h1 className="font-display text-6xl md:text-8xl font-black tracking-wider text-white text-glow select-none">
              STORM
            </h1>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-[0.3em] text-accent-lightning text-glow select-none -mt-2">
              ARENA
            </h1>
            <div className="absolute -inset-8 bg-accent-lightning/5 blur-3xl rounded-full" />
          </div>
          <p className="font-body text-sm text-storm-300 mt-4 tracking-widest uppercase">
            Survive the Storm
          </p>
        </div>

        <div className="storm-divider w-64" />

        <div
          className="flex flex-col gap-3 w-72 outline-none"
          role="menu"
          aria-label="Main menu"
          onKeyDown={(e) => {
            if (focusedIndex === -1 && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
              e.preventDefault();
              setFocusedIndex(0);
            }
          }}
        >
          {menuItems.map((item, index) => renderButton(item, index))}
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="font-body text-xs text-storm-300">
                Signed in as <span className="text-accent-lightning font-semibold">{username || 'Player'}</span>
              </span>
              <div className="w-px h-3 bg-storm-600" />
              <button
                onClick={logout}
                className="font-body text-xs text-storm-400 hover:text-player-red transition-colors duration-300 tracking-wider uppercase"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="font-body text-xs text-storm-400 hover:text-accent-lightning transition-colors duration-300 tracking-wider uppercase"
              >
                Sign In
              </button>
              <div className="w-px h-3 bg-storm-600" />
              <button
                onClick={() => navigate('/register')}
                className="font-body text-xs text-storm-400 hover:text-accent-lightning transition-colors duration-300 tracking-wider uppercase"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        title="Play With Friends"
        variant="confirm"
      >
        <div className="space-y-3">
          <p className="font-body text-sm text-storm-300 -mt-3 mb-3">
            Create a private room and invite your friends, or join one with a code.
          </p>
          <div
            className="flex flex-col gap-2 outline-none"
            role="menu"
            aria-label="Play with friends options"
          >
            {friendsItems.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  friendsRefs.current[item.id] = el;
                }}
                className="btn-secondary w-full text-left"
                onClick={item.action}
                onFocus={() => setFriendsMenuIndex(index)}
                onKeyDown={(e) => handleFriendsKeyDown(e, index)}
                tabIndex={friendsMenuIndex === index ? 0 : -1}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
