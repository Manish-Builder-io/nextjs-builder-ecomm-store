# Using copy-locale-using-script.js with Symbols

## The "MODULE_NOT_FOUND" Error Explained

The error "MODULE_NOT_FOUND" typically occurs when:

1. **Model name is incorrect** - Builder.io model names are case-sensitive and must be lowercase
2. **Entry ID doesn't exist** - The entry ID you're using doesn't exist for that model
3. **Model doesn't exist** - The model name doesn't exist in your Builder.io space

## How to Use the Script with Symbols

### Step 1: Update Configuration

Edit `copy-locale-using-script.js` and update these values:

```javascript
// Change MODEL_NAME to "symbol" (lowercase!)
const MODEL_NAME = "symbol";

// Update ENTRY_ID to your symbol's ID
const ENTRY_ID = "your-symbol-entry-id-here";
```

### Step 2: Get Your Symbol Entry ID

You can find symbol entry IDs in Builder.io:

1. Go to your Builder.io dashboard
2. Navigate to **Content** → **Symbols**
3. Click on the symbol you want to update
4. The entry ID is in the URL or in the symbol's details

Alternatively, you can use the script's improved error handling which will now show available entries if the ID is wrong.

### Step 3: Verify Model Name

The script now automatically normalizes model names to lowercase. However, make sure you're using:
- ✅ `"symbol"` (lowercase) - **Correct**
- ❌ `"Symbol"` (capitalized) - Will be converted but may cause issues
- ❌ `"symbols"` (plural) - **Wrong model name**

### Step 4: Run the Script

```bash
node copy-locale-using-script.js
```

## Improved Error Handling

The updated script now provides:

1. **Better error messages** - Shows exactly what went wrong
2. **Troubleshooting tips** - Suggests solutions for common issues
3. **Entry listing** - If entry not found, shows available entries
4. **Model name normalization** - Automatically converts to lowercase
5. **Detailed logging** - Shows API URLs and responses

## Common Issues and Solutions

### Issue: "MODULE_NOT_FOUND" or 404 Error

**Solution:**
- Verify the model name is exactly `"symbol"` (lowercase)
- Check that the entry ID exists in Builder.io
- Ensure your API keys are correct

### Issue: Entry Not Found

**Solution:**
- The script will now show available entries for the model
- Copy one of the shown entry IDs
- Update `ENTRY_ID` in the script

### Issue: 401/403 Unauthorized

**Solution:**
- Verify your `PRIVATE_KEY` (must start with `bpk-`)
- Check that your API key has write permissions
- Ensure the API key hasn't expired

## Example Usage

```javascript
// For a symbol entry
const MODEL_NAME = "symbol";
const ENTRY_ID = "3abc6b1b72b2483da64c61018ceed682";
const TARGET_LOCALE = "fr-FR";
```

## Testing

Before updating production content, test with:
1. A test symbol entry
2. Verify the changes in Builder.io dashboard
3. Check that localized values are correctly copied
