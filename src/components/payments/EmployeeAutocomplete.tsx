import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User } from '../../types';
import { Search, AlertCircle, Loader2, AtSign, Check, X, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EmployeeAutocompleteProps {
  allUsers: User[];
  primaryEmployeeId?: string;
  selectedEmployeeIds: string[];
  onSelectEmployee: (employee: User) => void;
  maxSharedEmployees?: number;
  disabled?: boolean;
}

export const EmployeeAutocomplete: React.FC<EmployeeAutocompleteProps> = ({
  allUsers,
  primaryEmployeeId,
  selectedEmployeeIds,
  onSelectEmployee,
  maxSharedEmployees = 3,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState('');
  const [fallbackUsers, setFallbackUsers] = useState<User[] | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [isLoadingFallback, setIsLoadingFallback] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFetchTimestampRef = useRef<number>(0);

  const directoryRequest = useRef<AbortController | null>(null);

  // The users table is restricted to each employee's own profile. Shared-payment
  // suggestions must use the staff directory RPC instead of that table.
  const fetchStaffList = async () => {
    if (!supabase || directoryRequest.current) return;
    const controller = new AbortController();
    directoryRequest.current = controller;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setIsLoadingFallback(true);
    setDirectoryError(false);
    try {
      const response = await Promise.race([
        supabase.rpc('get_active_staff_directory').abortSignal(controller.signal),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('Employee directory request timed out'));
          }, 10000);
        }),
      ]);
      if (directoryRequest.current !== controller) return;
      if (response.error) throw response.error;
      if (!Array.isArray(response.data)) throw new Error('Invalid employee directory response');
      setFallbackUsers(response.data as User[]);
      lastFetchTimestampRef.current = Date.now();
    } catch {
      if (directoryRequest.current === controller) setDirectoryError(true);
    } finally {
      clearTimeout(timeout);
      if (directoryRequest.current === controller) {
        directoryRequest.current = null;
        setIsLoadingFallback(false);
      }
    }
  };

  // 1. Fetch on mount & subscribe to Realtime changes on users table
  useEffect(() => {
    fetchStaffList();

    if (!supabase) return;
    const staffChannel = supabase
      .channel('realtime-staff-autocomplete')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchStaffList();
        }
      )
      .subscribe();

    return () => {
      directoryRequest.current?.abort();
      directoryRequest.current = null;
      supabase?.removeChannel(staffChannel);
    };
  }, []);

  // 2. Auto-refresh when input is focused if more than 3 seconds elapsed
  const handleInputFocus = () => {
    if (!disabled && !isLimitReached) {
      setActiveIndex(0);
      setIsOpen(true);
      const now = Date.now();
      if (now - lastFetchTimestampRef.current > 3000) {
        fetchStaffList();
      }
    }
  };

  // Use database identities so payment credits always reference real staff records.
  const candidateUsers = useMemo(() => {
    const userMap = new Map<string, User>();

    // A successful directory response replaces cached users, including an empty response.
    for (const u of fallbackUsers ?? allUsers ?? []) {
      if (u && u.id && (u.name || u.email)) {
        userMap.set(u.id.toLowerCase(), u);
      }
    }

    return Array.from(userMap.values()).filter((u) => {
      const isActive = u.is_active !== false;
      const isApproved = u.approval_status === 'approved';
      const isStaff = ['employee', 'manager', 'admin'].includes(u.role);
      return isActive && isApproved && isStaff;
    });
  }, [allUsers, fallbackUsers]);

  // Available unselected candidates (excluding primary employee and already added shared employees)
  const unselectedCandidates = useMemo(() => {
    const primaryId = (primaryEmployeeId || '').toLowerCase().trim();
    const selectedIds = new Set(selectedEmployeeIds.map((id) => (id || '').toLowerCase().trim()));

    return candidateUsers.filter(
      (u) => u.id.toLowerCase().trim() !== primaryId && !selectedIds.has(u.id.toLowerCase().trim())
    );
  }, [candidateUsers, primaryEmployeeId, selectedEmployeeIds]);

  // Clean query string: removes leading '@' and excess whitespace
  const cleanQuery = useMemo(() => {
    return inputValue.trim().replace(/^@+/, '').trim().toLowerCase();
  }, [inputValue]);

  // Compute suggestions synchronously (0ms delay for maximum responsiveness)
  const suggestions = useMemo(() => {
    if (!cleanQuery) {
      // If user typed only "@" or focused empty input, show available unselected staff alphabetically
      return [...unselectedCandidates]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, 10);
    }

    const q = cleanQuery;
    const qClean = q.replace(/[^a-z0-9]/g, '');
    const scored = unselectedCandidates
      .map((u) => {
        const rawName = (u.name || '').toLowerCase();
        const cleanName = rawName.replace(/[^a-z0-9]/g, '');
        const code = (u.employee_code || `EMP-${u.id.slice(0, 4)}`).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const designation = (u.designation || u.department || '').toLowerCase();

        let score = -1;
        if (rawName === q || (qClean && cleanName === qClean)) {
          score = 150; // exact match
        } else if (rawName.startsWith(q) || (qClean && cleanName.startsWith(qClean))) {
          score = 100; // name prefix match
        } else if (qClean && rawName.split(/[^a-z0-9]+/).some((part) => part.startsWith(qClean))) {
          score = 85; // word prefix (handles "A. Praveen" when searching "pra", "Bhavani N" when searching "bhava")
        } else if (rawName.includes(q) || (qClean && cleanName.includes(qClean))) {
          score = 65; // name contains
        } else if (code.startsWith(q) || code.includes(q)) {
          score = 50; // employee code match
        } else if (email.startsWith(q) || email.includes(q)) {
          score = 35; // email match
        } else if (designation.includes(q) || phone.includes(q)) {
          score = 20; // designation or phone match
        }

        return { user: u, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || (a.user.name || '').localeCompare(b.user.name || ''))
      .map((item) => item.user);

    return scored.slice(0, 10);
  }, [unselectedCandidates, cleanQuery]);

  // Accessibility announcements
  useEffect(() => {
    if (isOpen) {
      if (suggestions.length === 0 && cleanQuery) {
        setAnnouncement(`No active employee found for "${cleanQuery}".`);
      } else {
        setAnnouncement(`${suggestions.length} staff suggestions available.`);
      }
    }
  }, [isOpen, suggestions.length, cleanQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const isLimitReached = selectedEmployeeIds.length >= maxSharedEmployees;

  const handleSelect = (user: User) => {
    if (disabled || isLimitReached) return;
    if (user.id === primaryEmployeeId) return;
    if (selectedEmployeeIds.includes(user.id)) return;

    onSelectEmployee(user);
    setInputValue('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLimitReached) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
      } else if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0) {
        handleSelect(suggestions[activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : 0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  useEffect(() => {
    if (isOpen && activeIndex >= 0) {
      listboxRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper to highlight matching letters in employee name
  const renderHighlightedName = (name: string, query: string) => {
    if (!query) return <span>{name}</span>;
    const lowerName = name.toLowerCase();
    const index = lowerName.indexOf(query);
    if (index === -1) return <span>{name}</span>;

    const before = name.slice(0, index);
    const match = name.slice(index, index + query.length);
    const after = name.slice(index + query.length);

    return (
      <span>
        {before}
        <span className="bg-indigo-100 text-indigo-900 font-extrabold rounded-xs px-0.5">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full font-sans">
      {/* Screen Reader Live Region */}
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="employee-share-search"
            className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5"
          >
            <AtSign className="w-3.5 h-3.5 text-indigo-600" />
            <span>Add Shared Employee</span>
          </label>
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
            {selectedEmployeeIds.length}/{maxSharedEmployees} shared
          </span>
        </div>

        {/* Input Field with Combobox semantics */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {isLoadingFallback ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </div>

          <input
            id="employee-share-search"
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls="employee-suggestions-listbox"
            aria-autocomplete="list"
            autoComplete="off"
            aria-activedescendant={
              isOpen && activeIndex >= 0 && suggestions[activeIndex]
                ? `employee-opt-${suggestions[activeIndex].id}`
                : undefined
            }
            disabled={disabled || isLimitReached}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onFocus={handleInputFocus}
            onClick={() => {
              if (!isLimitReached && !isOpen) {
                handleInputFocus();
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isLimitReached
                ? `Max ${maxSharedEmployees} shared employees added`
                : 'Type @name, employee code, or email...'
            }
            className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all shadow-xs outline-none ${
              isLimitReached
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : isOpen
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 text-slate-900'
                : 'border-slate-300 hover:border-slate-400 text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
            }`}
          />

          {inputValue && !isLimitReached && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Add Team Member Chips (1-tap selection on mobile) */}
        {!isLimitReached && unselectedCandidates.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5 pb-0.5 scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
              Quick:
            </span>
            {unselectedCandidates.slice(0, 5).map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect(u);
                }}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold border border-slate-200/70 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <span className="text-indigo-600 font-bold">+</span>
                <span className="truncate max-w-[90px] sm:max-w-none">
                  {(u.name || 'Staff').split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {directoryError && (
        <div role="status" className="mt-2 flex items-center justify-between gap-2 text-xs text-amber-700">
          <span>Couldn’t load the shared employee directory. Retry or ask an administrator to check directory access.</span>
          <button type="button" disabled={disabled || isLoadingFallback} onClick={fetchStaffList}
            className="shrink-0 font-bold underline disabled:opacity-50">Retry</button>
        </div>
      )}

      {/* Dropdown Suggestions Listbox */}
      {isOpen && !isLimitReached && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="relative z-50 mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>
              {cleanQuery ? `Matching Employees ("@${cleanQuery}")` : 'Available Staff Members (Click to add)'}
            </span>
            <span className="hidden sm:inline">Use ↑ ↓ to navigate, Enter to select</span>
            <span className="sm:hidden text-indigo-600 font-bold">Tap to add</span>
          </div>

          <ul
            id="employee-suggestions-listbox"
            ref={listboxRef}
            role="listbox"
            className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1.5 focus:outline-none"
          >
            {suggestions.length === 0 ? (
              <li className="p-4 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-5 h-5 mx-auto text-amber-500" />
                <p className="font-semibold text-slate-700">
                  {isLoadingFallback ? 'Loading available employees…' : cleanQuery ? `No active employee found for "@${cleanQuery}".` : 'No other active staff available.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isLoadingFallback ? 'Please wait while we fetch the staff list.' : directoryError ? 'Use Retry above to reload the staff list.' : 'Check the spelling or try searching by employee code or email.'}
                </p>
              </li>
            ) : (
              suggestions.map((user, index) => {
                const isSelected = selectedEmployeeIds.includes(user.id);
                const isPrimary = user.id === primaryEmployeeId;
                const isCurrentActive = index === activeIndex;
                const empCode = user.employee_code || `EMP-${user.id.slice(0, 4).toUpperCase()}`;
                const designation =
                  user.designation ||
                  user.department ||
                  (user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Sales Executive');

                return (
                  <li
                    key={user.id}
                    id={`employee-opt-${user.id}`}
                    role="option"
                    aria-selected={isCurrentActive}
                    aria-disabled={isSelected || isPrimary}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isSelected && !isPrimary) {
                        handleSelect(user);
                      }
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected || isPrimary
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : isCurrentActive
                        ? 'bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Avatar or Initials */}
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {getInitials(user.name)}
                        </div>
                      )}

                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                            {renderHighlightedName(user.name, cleanQuery)}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            {empCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{designation}</span>
                          <span>•</span>
                          <span className="text-slate-400 truncate max-w-[140px] sm:max-w-none">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Primary
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors">
                          <UserPlus className="w-3 h-3" /> Add
                        </span>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
