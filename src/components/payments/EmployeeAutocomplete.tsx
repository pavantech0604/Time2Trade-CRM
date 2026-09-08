import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { Search, UserCheck, AlertCircle, Loader2, AtSign, Check, X } from 'lucide-react';

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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [announcement, setAnnouncement] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce input by 280ms
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      // Strip leading '@' if user typed '@'
      const clean = inputValue.startsWith('@') ? inputValue.slice(1).trim() : inputValue.trim();
      setDebouncedQuery(clean);
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(handler);
  }, [inputValue]);

  // Filter candidates from active company employees
  const candidateUsers = React.useMemo(() => {
    return allUsers.filter((u) => {
      // Must be active and staff
      const isActive = u.is_active !== false && u.approval_status !== 'rejected';
      const isStaff = u.role === 'employee' || u.role === 'admin';
      return isActive && isStaff;
    });
  }, [allUsers]);

  // Compute matched employees (up to 8 results)
  const suggestions = React.useMemo(() => {
    const unselectedCandidates = candidateUsers.filter(
      (u) => u.id !== primaryEmployeeId && !selectedEmployeeIds.includes(u.id)
    );

    if (!debouncedQuery) {
      // When no query is typed, show available unselected candidates
      return unselectedCandidates.slice(0, 8);
    }

    const q = debouncedQuery.toLowerCase();

    return unselectedCandidates
      .filter((u) => {
        const nameMatch = u.name?.toLowerCase().includes(q);
        const codeMatch = (u.employee_code || `EMP-${u.id.slice(0, 4)}`).toLowerCase().includes(q);
        const emailMatch = u.email?.toLowerCase().includes(q);
        const phoneMatch = u.phone ? u.phone.includes(q) : false;
        return nameMatch || codeMatch || emailMatch || phoneMatch;
      })
      .slice(0, 8);
  }, [candidateUsers, debouncedQuery, primaryEmployeeId, selectedEmployeeIds]);

  // Screen reader announcements
  useEffect(() => {
    if (isOpen) {
      if (isSearching) {
        setAnnouncement('Searching employees...');
      } else if (suggestions.length === 0 && debouncedQuery) {
        setAnnouncement('No active employee found. Check the name or employee code.');
      } else {
        setAnnouncement(`${suggestions.length} employee suggestions available.`);
      }
    }
  }, [isOpen, isSearching, suggestions.length, debouncedQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLimitReached = selectedEmployeeIds.length >= maxSharedEmployees;

  const handleSelect = (user: User) => {
    if (isLimitReached) return;
    if (user.id === primaryEmployeeId) return;
    if (selectedEmployeeIds.includes(user.id)) return;

    onSelectEmployee(user);
    setInputValue('');
    setDebouncedQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLimitReached) return;

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
      if (isOpen && activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'EM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const unselectedCandidates = React.useMemo(() => {
    return candidateUsers.filter(
      (u) => u.id !== primaryEmployeeId && !selectedEmployeeIds.includes(u.id)
    );
  }, [candidateUsers, primaryEmployeeId, selectedEmployeeIds]);

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
            <AtSign className="w-3.5 h-3.5 text-brand-primary" />
            <span>Add Shared Employee</span>
          </label>
          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
            {selectedEmployeeIds.length}/{maxSharedEmployees} shared
          </span>
        </div>

        {/* Input Field with Combobox semantics */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
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
            aria-activedescendant={
              activeIndex >= 0 && suggestions[activeIndex]
                ? `employee-opt-${suggestions[activeIndex].id}`
                : undefined
            }
            disabled={disabled || isLimitReached}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (candidateUsers.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isLimitReached
                ? `Max ${maxSharedEmployees} shared employees added`
                : 'Search @name, employee code, email...'
            }
            className={`w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all shadow-2xs outline-none ${
              isLimitReached
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                : isOpen
                ? 'border-brand-primary ring-2 ring-brand-primary/20 text-slate-800'
                : 'border-slate-300 hover:border-slate-400 text-slate-800 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
            }`}
          />

          {inputValue && !isLimitReached && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setDebouncedQuery('');
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
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
            {unselectedCandidates.slice(0, 4).map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSelect(u)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-brand-primary/10 hover:border-brand-primary/30 text-slate-700 hover:text-brand-primary text-[11px] font-semibold border border-slate-200/70 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <span className="text-brand-primary font-bold">+</span>
                <span className="truncate max-w-[80px] sm:max-w-none">{u.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown Suggestions Listbox */}
      {isOpen && !isLimitReached && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>{debouncedQuery ? 'Matching Employees' : 'Available Employees (Click to add)'}</span>
            <span>Use ↑ ↓ to navigate, Enter to select</span>
          </div>

          <ul
            id="employee-suggestions-listbox"
            ref={listboxRef}
            role="listbox"
            className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1.5 focus:outline-none"
          >
            {isSearching ? (
              <li className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                <span>Searching active company employees...</span>
              </li>
            ) : suggestions.length === 0 ? (
              <li className="p-4 text-center text-xs text-slate-500 space-y-1">
                <AlertCircle className="w-5 h-5 mx-auto text-amber-500" />
                <p className="font-semibold text-slate-700">No active employee found.</p>
                <p className="text-[11px] text-slate-400">Check the name or employee code.</p>
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
                  (user.role === 'admin' ? 'Administrator' : 'Sales Executive');

                return (
                  <li
                    key={user.id}
                    id={`employee-opt-${user.id}`}
                    role="option"
                    aria-selected={isCurrentActive}
                    aria-disabled={isSelected || isPrimary}
                    onClick={() => {
                      if (!isSelected && !isPrimary) {
                        handleSelect(user);
                      }
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`px-3 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected || isPrimary
                        ? 'opacity-50 cursor-not-allowed bg-slate-50'
                        : isCurrentActive
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar or Initials */}
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-brand-primaryLight text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                          {getInitials(user.name)}
                        </div>
                      )}

                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {user.name}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {empCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{designation}</span>
                          <span>•</span>
                          <span className="text-slate-400 truncate max-w-[150px]">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Primary (Submitting)
                        </span>
                      ) : isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                          Active
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
