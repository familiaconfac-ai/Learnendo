const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

function parseXmlDocument(xml) {
  if (typeof DOMParser === 'undefined') return null;
  try {
    return new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return null;
  }
}

function getNamespacedAttribute(element, namespaceLocalName, fallbackLocalName) {
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.endsWith(`:${namespaceLocalName}`)) {
      return attr.value;
    }
  }
  const direct = element.getAttribute(namespaceLocalName);
  if (direct) return direct;
  if (fallbackLocalName) {
    for (const attr of Array.from(element.attributes)) {
      if (attr.localName === fallbackLocalName) {
        return attr.value;
      }
    }
  }
  return '';
}

function extractRelationshipMap(xml, relTypeNeedle) {
  const map = new Map();
  const regex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*Type="([^"]+)"[^>]*\/?>/g;
  let match;
  while ((match = regex.exec(xml))) {
    const [, id, target, type] = match;
    if (!relTypeNeedle || type.includes(relTypeNeedle)) {
      map.set(id, target);
    }
  }
  return map;
}

async function testPptxImport(filePath) {
  console.log(`\n=== Testing PPTX Import ===`);
  console.log(`File: ${path.basename(filePath)}`);
  
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');
  
  if (!presentationXml || !presentationRelsXml) {
    console.error('❌ Invalid PPTX structure');
    return;
  }
  
  console.log('✓ PPTX structure valid');
  
  // Extract slide order using regex (simulating the fallback)
  const slideOrderRegex = [...presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((match) => match[1]);
  console.log(`\n📊 Slide Order (r:id values):`, slideOrderRegex);
  console.log(`   Total r:id references: ${slideOrderRegex.length}`);
  
  // Get presentation relationships
  const presentationRels = extractRelationshipMap(presentationRelsXml, '/slide');
  console.log(`\n🔗 Presentation Relationships (${presentationRels.size} entries):`);
  const relEntries = Array.from(presentationRels);
  relEntries.slice(0, 5).forEach(([relId, target]) => {
    console.log(`   ${relId} → ${target}`);
  });
  if (relEntries.length > 5) {
    console.log(`   ... and ${relEntries.length - 5} more`);
  }
  
  // Build ordered slide paths
  const slidePathsFromRelationships = slideOrderRegex
    .map((relId) => presentationRels.get(relId))
    .filter((target) => Boolean(target));
  
  console.log(`\n📄 Ordered Slide Paths (${slidePathsFromRelationships.length} slides):`);
  slidePathsFromRelationships.slice(0, 5).forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p}`);
  });
  if (slidePathsFromRelationships.length > 5) {
    console.log(`   ... and ${slidePathsFromRelationships.length - 5} more`);
  }
  
  // Get all available slide files
  const allSlideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((left, right) => {
      const leftNumber = Number(left.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      const rightNumber = Number(right.match(/slide(\d+)\.xml/i)?.[1] ?? 0);
      return leftNumber - rightNumber;
    });
  
  console.log(`\n📁 All Available Slide Files (${allSlideFiles.length}):`);
  allSlideFiles.forEach((file, idx) => {
    console.log(`   ${idx + 1}. ${file}`);
  });
  
  // Test image extraction for first slide
  console.log(`\n🖼️  Testing image extraction for Slide 1...`);
  const slide1Xml = await zip.file('ppt/slides/slide1.xml')?.async('text');
  if (slide1Xml) {
    const imageMatches = [...slide1Xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)].map((match) => match[1]);
    console.log(`   Blip references found: ${imageMatches.length}`);
    if (imageMatches.length > 0) {
      console.log(`   r:embed IDs: ${imageMatches.join(', ')}`);
    }
    
    // Get slide relationships
    const slideRelsXml = await zip.file('ppt/slides/_rels/slide1.xml.rels')?.async('text');
    if (slideRelsXml) {
      const slideRels = extractRelationshipMap(slideRelsXml);
      console.log(`   Slide relationships (${slideRels.size} entries):`);
      const slideRelEntries = Array.from(slideRels);
      slideRelEntries.forEach(([relId, target]) => {
        console.log(`     ${relId} → ${target}`);
      });
      
      // Map blip IDs to image paths
      for (const blipId of imageMatches) {
        const imagePath = slideRels.get(blipId);
        if (imagePath) {
          console.log(`   Image: ${blipId} → ${imagePath}`);
          const fullPath = `ppt/slides/${imagePath}`;
          const imageFile = zip.file(fullPath);
          if (imageFile) {
            const bytes = await imageFile.async('uint8array');
            console.log(`     ✓ Found: ${bytes.length} bytes`);
          } else {
            console.log(`     ✗ Not found in ZIP`);
          }
        }
      }
    }
  }
  
  console.log(`\n✅ Test complete\n`);
}

// Run tests
const files = [
  'c:\\Users\\conta\\Learnendo\\tmp\\pptx-inspect\\Aula 8 - Apresentação.pptx',
];

(async () => {
  for (const file of files) {
    try {
      await testPptxImport(file);
    } catch (error) {
      console.error(`❌ Error testing ${file}:`, error.message);
    }
  }
})();
