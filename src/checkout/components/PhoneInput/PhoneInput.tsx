/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./PhoneInput.module.css";
import { COUNTRY, defaultCountry, type ICountry } from "@/constants/country";
import ChevronDown from "@/assets/ChevronDown";
import { isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    required?: boolean;
    placeholder?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    label,
    required = false,
    placeholder = "Phone number",
}) => {
    // Determine initial country and number from value if present
    // Value format expected: "+1234567890"
    // We try to match the prefix with a country dial code

    const [selectedCountry, setSelectedCountry] = useState<ICountry>(defaultCountry);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [search, setSearch] = useState("");
    const [isTouched, setIsTouched] = useState(false);
    void isTouched;

    const isValid = phoneNumber.length === 0 || isValidPhoneNumber(`${selectedCountry.dial_code}${phoneNumber}`, selectedCountry.code as CountryCode);
    const showError = phoneNumber.length > 0 && !isValid;

    const filteredCountries = COUNTRY.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.dial_code && c.dial_code.includes(search))
    );

    // Initialize state from prop value
    useEffect(() => {
        if (!value) return;

        // Try to find matching country code
        // Sort countries by dial_code length desc to match longest prefix first
        const sortedCountries = [...COUNTRY].sort((a, b) => (b.dial_code?.length || 0) - (a.dial_code?.length || 0));

        const country = sortedCountries.find(c => value.startsWith(c.dial_code));

        if (country) {
            setSelectedCountry(country);
            setPhoneNumber(value.slice(country.dial_code.length));
        } else {
            // Fallback: mostly shouldn't happen if user enters valid code, but if value is just "123" 
            // and default is +1, we might just assume it's the number part?
            // For now, let's just set the number to value and keep default country if no match found
            setPhoneNumber(value);
        }
    }, [value]);

    const handleCountryChange = (countryCode: string) => {
        const country = COUNTRY.find(c => c.country_code === countryCode);
        if (country) {
            setSelectedCountry(country);
            const fullNumber = `${country.dial_code}${phoneNumber}`;
            if (isValidPhoneNumber(fullNumber, country.code as CountryCode)) {
                onChange(fullNumber);
            } else {
                onChange("");
            }
        }
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value.replace(/\D/g, ""); // Remove non-digits
        setPhoneNumber(num);
        const fullNumber = `${selectedCountry.dial_code}${num}`;
        if (isValidPhoneNumber(fullNumber, selectedCountry.code as CountryCode)) {
            onChange(fullNumber);
        } else {
            onChange("");
        }
    };

    return (
        <div className={styles.formGroup}>
            <label className={styles.label}>
                {label} {required && "*"}
            </label>
            <div className={styles.container}>
                <div className={styles.countrySelect}>
                    <Select.Root value={selectedCountry.country_code} onValueChange={handleCountryChange}>
                        <Select.Trigger className={styles.selectTrigger}>
                            <div className={styles.selectedContent}>
                                <img
                                    src={selectedCountry.flag}
                                    alt={selectedCountry.country_code}
                                    className={styles.flag}
                                />
                                <span className={styles.dialCode}>{selectedCountry.dial_code}</span>
                            </div>
                            <Select.Icon className={styles.selectIcon}>
                                <ChevronDown />
                            </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                            <Select.Content className={styles.selectContent} position="popper" sideOffset={5}>
                                <div style={{ padding: '8px', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1, borderBottom: '1px solid #e2e8f0' }}>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
                                    />
                                </div>
                                <Select.Viewport>
                                    {filteredCountries.length > 0 ? (
                                        filteredCountries.map((country) => (
                                            <Select.Item
                                                key={country.country_code}
                                                value={country.country_code}
                                                className={styles.selectItem}
                                            >
                                                <img
                                                    src={country.flag}
                                                    alt={country.name}
                                                    className={styles.flag}
                                                />
                                                <span>{country.name} ({country.dial_code})</span>
                                            </Select.Item>
                                        ))
                                    ) : (
                                        <div style={{ padding: '10px 16px', color: '#7d828d', fontSize: '14px' }}>No country found</div>
                                    )}
                                </Select.Viewport>
                            </Select.Content>
                        </Select.Portal>
                    </Select.Root>
                </div>
                <div className={styles.inputWrapper}>
                    <input
                        type="tel"
                        className={`${styles.input} ${showError ? styles.inputError : ''}`}
                        placeholder={placeholder}
                        value={phoneNumber}
                        onChange={handleNumberChange}
                        onBlur={() => setIsTouched(true)}
                    />
                </div>
            </div>
            {showError && (
                <div className={styles.errorMessage}>
                    Please enter a valid phone number
                </div>
            )}
        </div>
    );
};
