import React, { useState, useEffect } from "react";
import * as Select from "@radix-ui/react-select";
import styles from "./AdditionalInformation.module.css";
import ChevronDown from "@/assets/ChevronDown";
import { CountryDropdown } from "../CountryDropdown/CountryDropdown";
import { PhoneInput } from "../PhoneInput/PhoneInput";
import type { CustomCustomerField, CustomerInfo } from "@/api-services/types/publicPayments/get_paymentDetailsForPayer";

interface AdditionalInformationProps {
    customerInfo: CustomerInfo;
    onChange: (data: Record<string, string>) => void;
    onValidate: (isValid: boolean) => void;
}

export const AdditionalInformation: React.FC<AdditionalInformationProps> = ({
    customerInfo,
    onValidate,
    onChange,
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});

    useEffect(() => {
        const isValid = validateForm(formData);
        onValidate(isValid);
    }, [formData, customerInfo]);

    const validateForm = (data: Record<string, string>) => {
        // System Fields
        const sys = customerInfo.system;
        if (sys.name_and_shipping) {
            const required = sys.name_and_shipping.required === "1";

            if (required) {
                if (!data.fullName) return false;
                if (!data.country) return false;
                if (!data.streetName) return false;
                if (!data.streetNumber) return false;
                if (!data.city) return false;
                if (!data.zipCode) return false;
            }
        }

        if (sys.email && sys.email.required === "1" && !data.email) return false;
        if (sys.phone && sys.phone.required === "1" && !data.phone) return false;

        // Custom Fields
        if (customerInfo.custom) {
            for (const field of customerInfo.custom) {
                if (field.required === "1" && !data[field.key]) return false;
            }
        }

        return true;
    };

    const handleInputChange = (key: string, value: string) => {
        const updated = { ...formData, [key]: value };
        setFormData(updated);
        onChange(updated);
    };

    // Helper to render a standard input
    const renderInput = (
        key: string,
        label: string,
        type: string = "text",
        placeholder: string = "",
        required: boolean = false,
    ) => (
        <div className={styles.formGroup} key={key}>
            <label className={styles.label}>
                {label} {required && "*"}
            </label>
            <input
                type={type}
                className={styles.input}
                placeholder={placeholder}
                value={formData[key] || ""}
                onChange={(e) => handleInputChange(key, e.target.value)}
            />
        </div>
    );

    // Helper to render a select using Radix UI
    const renderSelect = (
        key: string,
        label: string,
        options: string[],
        placeholder: string,
        required: boolean = false,
    ) => (
        <div className={styles.formGroup} key={key}>
            <label className={styles.label}>
                {label} {required && "*"}
            </label>
            <Select.Root
                value={formData[key] || ""}
                onValueChange={(value) => handleInputChange(key, value)}
            >
                <Select.Trigger className={styles.select}>
                    <Select.Value placeholder={placeholder} />
                    <Select.Icon className={styles.selectIcon}>
                        <ChevronDown />
                    </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content className={styles.selectContent}>
                        <Select.Viewport>
                            {options.map((opt) => (
                                <Select.Item
                                    key={opt}
                                    value={opt}
                                    className={styles.selectItem}
                                >
                                    <Select.ItemText>{opt}</Select.ItemText>
                                </Select.Item>
                            ))}
                        </Select.Viewport>
                    </Select.Content>
                </Select.Portal>
            </Select.Root>
        </div>
    );

    return (
        <div className={styles.container}>
            <h3 className={styles.title}>Additional Information</h3>

            {/* System Fields - Name & Shipping Section */}
            {/* System Fields - Name & Shipping Section */}
            {/* Email and Phone */}
            {customerInfo.system.email &&
                renderInput(
                    "email",
                    "Email Address",
                    "email",
                    "johndoe@gmail.com",
                    customerInfo.system.email.required === "1",
                )}

            {customerInfo.system.phone && (
                <PhoneInput
                    label="Phone Number"
                    value={formData["phone"] || ""}
                    onChange={(value) => handleInputChange("phone", value)}
                    required={customerInfo.system.phone.required === "1"}
                />
            )}

            {customerInfo.system.name_and_shipping && (
                <>
                    {renderInput(
                        "fullName",
                        "Full Name",
                        "text",
                        "John Doe",
                        customerInfo.system.name_and_shipping.required === "1",
                    )}

                    <CountryDropdown
                        label="Country"
                        value={formData["country"] || ""}
                        onChange={(value: string) => handleInputChange("country", value)}
                        required={customerInfo.system.name_and_shipping.required === "1"}
                    />

                    <div className={styles.row}>
                        <div className={styles.col}>
                            {renderInput(
                                "streetName",
                                "Street Name",
                                "text",
                                "Enter street name",
                                customerInfo.system.name_and_shipping.required === "1",
                            )}
                        </div>
                        <div className={styles.col}>
                            {renderInput(
                                "streetNumber",
                                "Number",
                                "text",
                                "John Doe",
                                customerInfo.system.name_and_shipping.required === "1",
                            )}
                        </div>
                    </div>

                    {renderInput(
                        "city",
                        "City",
                        "text",
                        "Enter city",
                        customerInfo.system.name_and_shipping.required === "1",
                    )}
                    {renderInput(
                        "zipCode",
                        "Postal/Zip Code",
                        "text",
                        "Enter zip code",
                        customerInfo.system.name_and_shipping.required === "1",
                    )}
                </>
            )}

            {/* Custom Fields */}
            {customerInfo.custom?.map((field: CustomCustomerField) => {
                const isRequired = field.required === "1";
                const placeholder = field.description || `Enter ${field.label.toLowerCase()}`;

                if (field.type === "select" && field.options) {
                    return renderSelect(
                        field.key,
                        field.label,
                        field.options,
                        placeholder,
                        isRequired,
                    );
                }

                return renderInput(
                    field.key,
                    field.label,
                    field.type,
                    placeholder,
                    isRequired,
                );
            })}
        </div>
    );
};
