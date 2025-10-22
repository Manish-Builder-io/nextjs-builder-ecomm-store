import https from 'https';
import readline from 'readline';

// Builder.io API configuration
const API_KEY = 'YOUR-API-KEY';
const PRIVATE_KEY = 'bpk-YOUR_PRIVATE_KEY';
const BASE_URL = 'cdn.builder.io';
const WRITE_API_URL = 'builder.io';

const MODEL_OPTIONS = [
  { value: 'page', label: 'Page' },
  { value: 'symbol', label: 'Symbol' },
];

const UPDATE_TYPES = [
  { value: 'domain', label: 'Domain Only', description: 'Replace cdn.builder.io → newdomain.com' },
  { value: 'apiVersion', label: 'API Version', description: 'Replace /api/v3/ → /api/v1/' },
  { value: 'model', label: 'Model Type', description: 'Replace /content/images-data → /content/new-model' },
  { value: 'id', label: 'Content ID', description: 'Replace /images-data/123 → /images-data/new-id-123' },
  { value: 'full', label: 'Full URL', description: 'Replace the entire URL' }
];

/**
 * Fetches entries for the specified model from Builder.io Content API with query filters
 */
async function fetchEntries(model = 'page', queryParams = {}, limit = 100, offset = 0, fields = '') {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams();
    queryString.append('apiKey', API_KEY);
    queryString.append('limit', limit.toString());
    queryString.append('offset', offset.toString());
    queryString.append('fetchTotalCount', 'true');
    
    if (fields) {
      queryString.append('fields', fields);
    }
    
    Object.entries(queryParams).forEach(([key, value]) => {
      queryString.append(key, value);
    });
    
    const path = `/api/v3/content/${model}?${queryString.toString()}`;
    
    const options = {
      hostname: BASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.end();
  });
}

/**
 * Fetches all entries with httpRequests data by handling pagination automatically
 */
async function fetchAllEntriesWithHttpRequests(model = 'page') {
  const allEntries = [];
  const limit = 100;
  let totalCount = null;
  let fetchedCount = 0;

  console.log(`🚀 Starting to fetch ${model} entries with httpRequests data...`);

  try {
    console.log('📊 Getting total count...');
    const firstResponse = await fetchEntries(model, { 'query.data.httpRequests.$exists': 'true' }, limit, 0, 'id,data');
    
    totalCount = firstResponse.total || 0;
    console.log(`📈 Total ${model} entries with httpRequests: ${totalCount}`);
    
    if (firstResponse.results && firstResponse.results.length > 0) {
      allEntries.push(...firstResponse.results);
      fetchedCount = firstResponse.results.length;
      console.log(`✅ Fetched ${fetchedCount}/${totalCount} entries (${Math.round((fetchedCount/totalCount)*100)}%)`);
    }
    
    if (fetchedCount >= totalCount) {
      console.log('🎉 All entries fetched in first request!');
      return allEntries;
    }
    
    // Continue fetching remaining entries
    let offset = limit;
    while (fetchedCount < totalCount) {
      const remainingCount = totalCount - fetchedCount;
      const currentLimit = Math.min(limit, remainingCount);
      
      console.log(`📄 Fetching entries ${offset + 1}-${offset + currentLimit}...`);
      
      const response = await fetchEntries(model, { 'query.data.httpRequests.$exists': 'true' }, currentLimit, offset, 'id,data');
      
      if (response.results && response.results.length > 0) {
        allEntries.push(...response.results);
        fetchedCount += response.results.length;
        const progress = Math.round((fetchedCount/totalCount)*100);
        console.log(`✅ Fetched ${fetchedCount}/${totalCount} entries (${progress}%)`);
        offset += currentLimit;
      } else {
        console.log('⚠️ No more results returned, stopping...');
        break;
      }
    }

    console.log(`\n🎉 Successfully fetched ${fetchedCount}/${totalCount} ${model} entries with httpRequests`);
    return allEntries;

  } catch (error) {
    console.error('❌ Error fetching entries:', error.message);
    return [];
  }
}

/**
 * Updates an entry using Builder.io Write API
 */
async function updateEntry(model, entryId, updateData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(updateData);
    
    const options = {
      hostname: WRITE_API_URL,
      port: 443,
      path: `/api/v1/write/${model}/${entryId}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${PRIVATE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Generates preview of updates
 */
function generatePreview(entries, updateType, newValue) {
  const updates = [];
  
  entries.forEach(entry => {
    if (entry.data?.httpRequests) {
      Object.entries(entry.data.httpRequests).forEach(([key, value]) => {
        let updatedValue = value;
        
        switch (updateType) {
          case 'domain':
            updatedValue = value.replace(/https:\/\/[^\/]+/, `https://${newValue}`);
            break;
          case 'apiVersion':
            updatedValue = value.replace(/\/api\/v[0-9]+\//, `/api/${newValue}/`);
            break;
          case 'model':
            updatedValue = value.replace(/\/content\/[^\/]+/, `/content/${newValue}`);
            break;
          case 'id':
            updatedValue = value.replace(/\/content\/[^\/]+\/[^?\/]+/, `/content/images-data/${newValue}`);
            break;
          case 'full':
            updatedValue = newValue;
            break;
        }

        if (updatedValue !== value) {
          updates.push({
            entryId: entry.id,
            key,
            originalValue: value,
            updatedValue
          });
        }
      });
    }
  });

  return updates;
}

/**
 * Displays preview in console
 */
function displayPreview(updates) {
  console.log('\n📋 PREVIEW OF CHANGES:');
  console.log('='.repeat(80));
  
  updates.forEach((update, index) => {
    console.log(`\n${index + 1}. Entry ID: ${update.entryId}`);
    console.log(`   Key: ${update.key}`);
    console.log(`   ORIGINAL: ${update.originalValue}`);
    console.log(`   UPDATED:  ${update.updatedValue}`);
    console.log('   ' + '-'.repeat(70));
  });
  
  console.log(`\n📊 Total updates: ${updates.length} across ${new Set(updates.map(u => u.entryId)).size} entries`);
}

/**
 * Interactive prompt for user input
 */
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main interactive function
 */
async function main() {
  console.log('🚀 Builder.io Content API - httpRequests Updater');
  console.log('='.repeat(60));

  try {
    // Step 1: Select model
    console.log('\n📋 Available Models:');
    MODEL_OPTIONS.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option.label} (${option.value})`);
    });
    
    const modelChoice = await promptUser('\nSelect model (1-2) [1]: ');
    const selectedModel = MODEL_OPTIONS[parseInt(modelChoice) - 1] || MODEL_OPTIONS[0];
    console.log(`✅ Selected: ${selectedModel.label}`);

    // Step 2: Fetch entries
    console.log('\n🔄 Fetching entries with httpRequests data...');
    const entries = await fetchAllEntriesWithHttpRequests(selectedModel.value);
    
    if (entries.length === 0) {
      console.log('❌ No entries found with httpRequests data');
      return;
    }

    // Step 3: Display entries summary
    console.log('\n📊 ENTRIES FOUND:');
    console.log('='.repeat(40));
    entries.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry.id}`);
      if (entry.data?.title) {
        console.log(`   Title: ${entry.data.title}`);
      }
      if (entry.data?.url) {
        console.log(`   URL: ${entry.data.url}`);
      }
      if (entry.data?.httpRequests) {
        console.log(`   HTTP Requests: ${Object.keys(entry.data.httpRequests).length} keys`);
        Object.entries(entry.data.httpRequests).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value.substring(0, 60)}...`);
        });
      }
      console.log('   ' + '-'.repeat(35));
    });

    // Step 4: Select update type
    console.log('\n🔄 Update Types:');
    UPDATE_TYPES.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type.label}`);
      console.log(`      ${type.description}`);
    });
    
    const updateChoice = await promptUser('\nSelect update type (1-5) [1]: ');
    const selectedUpdateType = UPDATE_TYPES[parseInt(updateChoice) - 1] || UPDATE_TYPES[0];
    console.log(`✅ Selected: ${selectedUpdateType.label}`);

    // Step 5: Get new value
    const placeholders = {
      domain: 'newdomain.com',
      apiVersion: 'v1',
      model: 'new-model',
      id: 'new-id-123',
      full: 'https://newdomain.com/api/v1/content/model/id'
    };
    
    const newValue = await promptUser(`\nEnter new value [${placeholders[selectedUpdateType.value]}]: `);
    if (!newValue) {
      console.log('❌ New value is required');
      return;
    }

    // Step 6: Generate and display preview
    console.log('\n🔄 Generating preview...');
    const updates = generatePreview(entries, selectedUpdateType.value, newValue);
    
    if (updates.length === 0) {
      console.log('❌ No changes would be made with these parameters');
      return;
    }

    displayPreview(updates);

    // Step 7: Confirm update
    console.log('\n⚠️  WARNING: This will modify your Builder.io content!');
    const confirmation = await promptUser('\nDo you want to proceed? (yes/no) [no]: ');
    
    if (confirmation.toLowerCase() !== 'yes') {
      console.log('❌ Update cancelled by user');
      return;
    }

    // Step 8: Apply updates
    console.log('\n🚀 Applying updates...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      try {
        console.log(`📝 Updating ${update.entryId} (${i + 1}/${updates.length})...`);
        
        // Find the entry to get current httpRequests
        const entry = entries.find(e => e.id === update.entryId);
        if (!entry) {
          console.log(`⚠️ Entry ${update.entryId} not found, skipping...`);
          errorCount++;
          continue;
        }

        // Create updated httpRequests object
        const updatedHttpRequests = { ...entry.data.httpRequests };
        updatedHttpRequests[update.key] = update.updatedValue;

        const updateData = {
          data: {
            httpRequests: updatedHttpRequests
          }
        };

        await updateEntry(selectedModel.value, update.entryId, updateData);
        console.log(`✅ Successfully updated ${update.entryId}`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error updating ${update.entryId}:`, error.message);
        errorCount++;
      }
    }

    // Step 9: Final results
    console.log('\n🎉 UPDATE COMPLETE!');
    console.log('='.repeat(30));
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${errorCount}`);
    console.log(`📊 Total processed: ${updates.length}`);

    if (successCount > 0) {
      console.log('\n💾 Saving updated entries to file...');
      const fs = await import('fs');
      const outputFile = `updated-${selectedModel.value}-entries-${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2));
      console.log(`✅ Updated entries saved to ${outputFile}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

// Export functions for use in other modules
export { fetchEntries, fetchAllEntriesWithHttpRequests, updateEntry, generatePreview };

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}