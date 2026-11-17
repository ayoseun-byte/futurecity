/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./CountryDropdown.module.css";
import { COUNTRY } from "@/constants/country";
import ChevronDown from "@/assets/ChevronDown";

interface CountryDropdownProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    required?: boolean;
}

export const CountryDropdown: React.FC<CountryDropdownProps> = ({
    value,
    onChange,
    label,
    placeholder = "Select Country",
    required = false,
}) => {
    const [search, setSearch] = useState("");
    const filteredCountries = COUNTRY.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.dial_code && c.dial_code.includes(search))
    );

    return (
        <div className={styles.formGroup}>
            <label className={styles.label}>
                {label} {required && "*"}
            </label>
            <Select.Root value={value} onValueChange={onChange}>
                <Select.Trigger className={styles.select}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {value ? (
                            <>
                                <img
                                    src={COUNTRY.find((c) => c.name === value)?.flag}
                                    alt=""
                                    className={styles.flag}
                                />
                                <span>{value}</span>
                            </>
                        ) : (
                            <span style={{ color: "var(--Grey-500, #7d828d)" }}>
                                {placeholder}
                            </span>
                        )}
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
                                placeholder="Search country..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
                            />
                        </div>
                        <Select.Viewport>
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                    <Select.Item
                                        key={country.country_code} // Using ISO-3 code as key
                                        value={country.name} // Storing Name as value, can change to code if backend needs
                                        className={styles.selectItem}
                                    >
                                        <img
                                            src={country.flag}
                                            alt={`${country.name} flag`}
                                            className={styles.flag}
                                        />
                                        <Select.ItemText>{country.name}</Select.ItemText>
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
    );
};
