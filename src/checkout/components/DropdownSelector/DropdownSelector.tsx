/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import styles from "./DropdownSelector.module.css";
import ChevronDown from "@/assets/ChevronDown";
import CheckIcon from "@/assets/CheckIcon";
import { TokenIcon } from "../TokenIcon/TokenIcon";
import type { Network } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";

export interface SelectorOption {
  id: string;
  name: string;
  subtitle?: string;
  icon: string;
  balance?: number;
  symbol?: string;
  tokenAddress?: string;
  networks?: Network[];
}

interface DropdownSelectorProps {
  options: SelectorOption[];
  selectedOption: SelectorOption | null;
  onSelect: (option: SelectorOption) => void;
  label: string;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  options,
  selectedOption,
  onSelect,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(search.toLowerCase()) ||
      opt.subtitle?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (option: SelectorOption) => {
    onSelect(option);
    setIsOpen(false);
    setSearch("");
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setSearch("");
  };

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
      setSearch("");
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className={styles.selectorSection} ref={containerRef}>
      <label className={styles.sectionLabel}>{label}</label>

      {/* Trigger */}
      <button
        type="button"
        className={`${styles.selector} ${isOpen ? styles.selectorOpen : ""}`}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={styles.selectorContent}>
          {selectedOption ? (
            <>
              <TokenIcon
                src={selectedOption.icon}
                alt={selectedOption.name}
                size={24}
                className={styles.icon}
              />
              <div className={styles.info}>
                <div className={styles.name}>{selectedOption.name}</div>
                {selectedOption.subtitle && (
                  <div className={styles.subtitle}>
                    {selectedOption.subtitle}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.info}>
              <div className={styles.name}>Select {label}</div>
            </div>
          )}
        </div>

        <div className={styles.triggerRight}>
          {/* {selectedOption?.balance != null && (
            <span className={styles.triggerBalance}>
              {clipAmount(selectedOption.balance)} {selectedOption.symbol}
            </span>
          )} */}
          <span
            className={`${styles.dropdownArrow} ${isOpen ? styles.dropdownArrowOpen : ""}`}
          >
            <ChevronDown color="#7D828D" />
          </span>
        </div>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className={styles.dropdownMenu} role="listbox">
          {/* Search */}
          <div className={styles.searchWrapper}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle cx="11" cy="11" r="8" stroke="#7D828D" strokeWidth="2" />
              <path
                d="M21 21l-4.35-4.35"
                stroke="#7D828D"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Options list */}
          <div className={styles.optionsList}>
            {filtered.length === 0 ? (
              <div className={styles.noResults}>
                No results for &quot;{search}&quot;
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedOption?.id === option.id;
                return (
                  <button
                    type="button"
                    key={option.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.dropdownItem} ${isSelected ? styles.selected : ""}`}
                    onClick={() => handleSelect(option)}
                  >
                    <TokenIcon
                      src={option.icon}
                      alt={option.name}
                      size={24}
                      className={styles.icon}
                    />
                    <div className={styles.info}>
                      <div className={styles.name}>{option.name}</div>
                      {option.subtitle && (
                        <div className={styles.subtitle}>{option.subtitle}</div>
                      )}
                    </div>

                    <div className={styles.itemRight}>
                      {/* {option.balance != null && (
                        <span className={styles.balance}>
                          {clipAmount(option.balance)}
                          <span className={styles.balanceSymbol}> {option.symbol}</span>
                        </span>
                      )} */}
                      {isSelected && (
                        <span className={styles.checkmark}>
                          <CheckIcon />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
