// One upsert form, three dashboards.
//
// PUT /api/settings/v1/{key} creates a setting if the key is new and overwrites the label, value,
// type, description and status if it already exists - there is no separate "edit setting"
// endpoint the dashboard could point a row at. So the add form doubles as the editor: saving a
// key that is already listed updates it in place.
export const settingsCreate = (scopeName) => ({
  label: `Add / update ${scopeName} setting`,
  initial: { valueType: "String", status: "Active" },
  form: [
    {
      name: "key",
      label: "Setting key",
      required: true,
      pattern: /^[a-z0-9_.-]{1,128}$/,
      message: "Use lowercase letters, digits, dot, underscore or dash (up to 128)",
      placeholder: "upi_tdr_bps",
      hint: "The id the apps read. Saving a key that already exists overwrites what it holds.",
    },
    {
      name: "label",
      label: "Display name",
      required: true,
      pattern: /^.{1,255}$/,
      message: "Keep the name under 256 characters",
      placeholder: "UPI transaction discount rate (bps)",
    },
    {
      name: "valueType",
      label: "Value type",
      type: "select",
      options: ["String", "Number", "Boolean", "JSON"],
      required: true,
      hint: "Decides how the value below is checked and how the app parses it.",
    },
    {
      name: "value",
      label: "Value",
      required: true,
      pattern: /^[\s\S]{1,4000}$/,
      message: "Keep the value under 4000 characters",
      placeholder: (v) =>
        ({
          Number: "40",
          Boolean: "true",
          JSON: '{"t0": 0.40, "t1": 0.25}',
        })[v.valueType] || "flat 50% off",
      validate: (v) => {
        const value = String(v.value || "").trim();
        if (!value) return undefined;
        if (v.valueType === "Number" && !Number.isFinite(Number(value))) {
          return "Enter a number, for example 1500.50";
        }
        if (v.valueType === "Boolean" && !/^(true|false|0|1|yes|no)$/i.test(value)) {
          return "Enter true or false";
        }
        if (v.valueType === "JSON") {
          try {
            JSON.parse(value);
          } catch {
            return "Enter valid JSON, for example {\"t0\": 0.4}";
          }
        }
        return undefined;
      },
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      rows: 3,
      pattern: /^[\s\S]{0,2000}$/,
      message: "Keep the description under 2000 characters",
      placeholder: "What the setting does and who it affects.",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
      hint: `Inactive keeps the ${scopeName} setting on file without serving it to the apps.`,
    },
  ],
});
