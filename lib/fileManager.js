// fileManager.js
import fs from "fs/promises";
import path from "path";

export class FileManager {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
  }

  // Ensure directory exists (auto-create if missing)
  async ensureDir(dirPath = this.baseDir) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  // Change the working directory dynamically
  async setDirectory(dirPath) {
    this.baseDir = dirPath;
    await this.ensureDir(dirPath);
  }

  // Resolve a path inside the base directory
  resolvePath(fileName) {
    return path.join(this.baseDir, fileName);
  }

  // Write data to a file (creates dir if needed)
  async writeFile(fileName, data) {
    await this.ensureDir();
    const filePath = this.resolvePath(fileName);
    await fs.writeFile(filePath, data, "utf-8");
    return filePath;
  }

  // Read data from a file
  async readFile(fileName) {
    const filePath = this.resolvePath(fileName);
    return fs.readFile(filePath, "utf-8");
  }

  // Append to a file (creates dir if needed)
  async appendFile(fileName, data) {
    await this.ensureDir();
    const filePath = this.resolvePath(fileName);
    await fs.appendFile(filePath, data, "utf-8");
    return filePath;
  }

  // List files in the current directory
  async listFiles() {
    await this.ensureDir();
    return fs.readdir(this.baseDir);
  }

  // -------------------------------
  // 🔹 JSON File Methods
  // -------------------------------

  async writeJSON(fileName, obj, pretty = true) {
    await this.ensureDir();
    const filePath = this.resolvePath(fileName);
    const jsonData = pretty
      ? JSON.stringify(obj, null, 2)
      : JSON.stringify(obj);
    await fs.writeFile(filePath, jsonData, "utf-8");
    return filePath;
  }

  async readJSON(fileName) {
    const filePath = this.resolvePath(fileName);
    const data = await fs.readFile(filePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
  }

  async mergeJSON(fileName, newData, pretty = true) {
    let existingData = {};
    const filePath = this.resolvePath(fileName);

    try {
      existingData = await this.readJSON(fileName);
    } catch {
      // If file doesn't exist or invalid JSON, we start fresh
      existingData = {};
    }

    const mergedData = { ...existingData, ...newData };

    await this.writeJSON(fileName, mergedData, pretty);
    return mergedData;
  }
}
