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

  // Resolve a path inside either base directory or provided directory
  resolvePath(fileName, dirPath = this.baseDir) {
    return path.join(dirPath, fileName);
  }

  // -------------------------------
  // 🔹 Text File Methods
  // -------------------------------

  async writeFile(fileName, data, dirPath = this.baseDir) {
    await this.ensureDir(dirPath);
    const filePath = this.resolvePath(fileName, dirPath);
    await fs.writeFile(filePath, data, "utf-8");
    return filePath;
  }

  async readFile(fileName, dirPath = this.baseDir) {
    const filePath = this.resolvePath(fileName, dirPath);
    return fs.readFile(filePath, "utf-8");
  }

  async appendFile(fileName, data, dirPath = this.baseDir) {
    await this.ensureDir(dirPath);
    const filePath = this.resolvePath(fileName, dirPath);
    await fs.appendFile(filePath, data, "utf-8");
    return filePath;
  }

  async listFiles(dirPath = this.baseDir) {
    await this.ensureDir(dirPath);
    return fs.readdir(dirPath);
  }

  // -------------------------------
  // 🔹 JSON File Methods
  // -------------------------------

  async writeJSON(fileName, obj, pretty = true, dirPath = this.baseDir) {
    await this.ensureDir(dirPath);
    const filePath = this.resolvePath(fileName, dirPath);
    const jsonData = pretty
      ? JSON.stringify(obj, null, 2)
      : JSON.stringify(obj);
    await fs.writeFile(filePath, jsonData, "utf-8");
    return filePath;
  }

  async readJSON(fileName, dirPath = this.baseDir) {
    const filePath = this.resolvePath(fileName, dirPath);
    const data = await fs.readFile(filePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
  }

  async mergeJSON(fileName, newData, pretty = true, dirPath = this.baseDir) {
    let existingData = {};
    const filePath = this.resolvePath(fileName, dirPath);

    try {
      existingData = await this.readJSON(fileName, dirPath);
    } catch {
      existingData = {}; // Start fresh if file doesn't exist
    }

    const mergedData = { ...existingData, ...newData };
    await this.writeJSON(fileName, mergedData, pretty, dirPath);
    return mergedData;
  }
}
