const fs = require('fs');
const path = require('path');

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

function testPptxStructure(basePath) {
  console.log(`\n=== Testing PPTX Structure ===`);
  console.log(`Base: ${basePath}`);
  
  // Read presentation.xml
  const presentationXml = fs.readFileSync(path.join(basePath, 'ppt', 'presentation.xml'), 'utf-8');
  const presentationRelsXml = fs.readFileSync(path.join(basePath, 'ppt', '_rels', 'presentation.xml.rels'), 'utf-8');
  
  console.log('✓ Files read successfully');
  
  // Extract slide order using regex
  const slideOrderRegex = [...presentationXml.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map((match) => match[1]);
  console.log(`\n📊 Slide Order (r:id values): ${slideOrderRegex.length} slides`);
  console.log(`   [${slideOrderRegex.join(', ')}]`);
  
  // Get presentation relationships
  const presentationRels = extractRelationshipMap(presentationRelsXml, '/slide');
  console.log(`\n🔗 Presentation Relationships (${presentationRels.size} entries):`);
  for (const [relId, target] of Array.from(presentationRels).slice(0, 5)) {
    console.log(`   ${relId} → ${target}`);
  }
  if (presentationRels.size > 5) {
    console.log(`   ... and ${presentationRels.size - 5} more`);
  }
  
  // Build ordered slide paths
  const slidePathsFromRelationships = slideOrderRegex
    .map((relId) => presentationRels.get(relId))
    .filter((target) => Boolean(target));
  
  console.log(`\n📄 Final Ordered Slide Paths: ${slidePathsFromRelationships.length} slides`);
  slidePathsFromRelationships.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p}`);
  });
  
  // Test slide 1 structure
  console.log(`\n🖼️  Testing Slide 1 Structure...`);
  const slide1Xml = fs.readFileSync(path.join(basePath, 'ppt', 'slides', 'slide1.xml'), 'utf-8');
  
  // Look for images in slide1
  const imageMatches = [...slide1Xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)].map((match) => match[1]);
  console.log(`   Images found (blip r:embed): ${imageMatches.length}`);
  if (imageMatches.length > 0) {
    console.log(`   Image IDs: ${imageMatches.join(', ')}`);
  }
  
  // Read slide1 relationships
  const slide1RelsXml = fs.readFileSync(path.join(basePath, 'ppt', 'slides', '_rels', 'slide1.xml.rels'), 'utf-8');
  const slide1Rels = extractRelationshipMap(slide1RelsXml);
  console.log(`   Slide 1 relationships: ${slide1Rels.size} entries`);
  for (const [relId, target] of slide1Rels) {
    console.log(`     ${relId} → ${target}`);
  }
  
  // Map images to file paths
  for (const blipId of imageMatches) {
    const imagePath = slide1Rels.get(blipId);
    if (imagePath) {
      const fullPath = path.join(basePath, 'ppt', 'slides', imagePath);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`   ✓ Image found: ${blipId} → ${imagePath} (${stats.size} bytes)`);
      } else {
        console.log(`   ✗ Image not found: ${imagePath}`);
      }
    }
  }
  
  console.log(`\n✅ Analysis complete\n`);
}

testPptxStructure('c:\\Users\\conta\\Learnendo\\tmp\\pptx-inspect\\unzipped');
