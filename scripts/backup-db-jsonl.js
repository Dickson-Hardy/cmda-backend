const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.join(process.cwd(), "backups", "db-backups", timestamp);
  fs.mkdirSync(backupRoot, { recursive: true });

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  const manifest = {
    createdAt: new Date().toISOString(),
    databaseName: db.databaseName,
    backupPath: backupRoot,
    collectionCount: collections.length,
    collections: [],
  };

  for (const collectionInfo of collections) {
    const name = collectionInfo.name;
    const collection = db.collection(name);
    const filePath = path.join(backupRoot, `${name}.jsonl`);
    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    let exported = 0;
    const cursor = collection.find({});
    for await (const doc of cursor) {
      stream.write(JSON.stringify(doc) + "\n");
      exported += 1;
    }

    await new Promise((resolve) => stream.end(resolve));

    const indexes = await collection.indexes();
    manifest.collections.push({
      name,
      documentCount: exported,
      file: `${name}.jsonl`,
      indexes,
    });

    console.log(`Exported ${name}: ${exported}`);
  }

  const manifestPath = path.join(backupRoot, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nBackup complete: ${backupRoot}`);

  await mongoose.disconnect();
})().catch(async (error) => {
  console.error("Backup failed:", error);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
