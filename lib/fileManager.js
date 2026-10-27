import fs from "fs/promises";
import path from "path";

/**
 * FileManager
 * A versatile file and JSON manager with dynamic directories, deep merge,
 * array/object handling, batch updates, and removals.
 */
export class FileManager {
  /**
   * @param {string} baseDir - Base directory for all file operations (default: process.cwd())
   */
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Ensures that a directory exists.
   * @param {string} dirPath
   */
  async ensureDir(dirPath = this.baseDir) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  /**
   * Resolves a file path relative to baseDir or absolute path.
   * @param {string} fileName
   * @param {string} dirPath
   * @returns {string} Full file path
   */
  resolvePath(fileName, dirPath = this.baseDir) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    return path.join(fullDir, fileName);
  }

  // ===============================
  // Text File Methods
  // ===============================

  /**
   * Write string data to a file
   * @param {string} fileName
   * @param {string} data
   * @param {string} dirPath
   */
  async writeFile(fileName, data, dirPath = this.baseDir) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    await this.ensureDir(fullDir);
    const filePath = this.resolvePath(fileName, dirPath);
    await fs.writeFile(filePath, data, "utf-8");
    return filePath;
  }

  /**
   * Read file content as string
   * @param {string} fileName
   * @param {string} dirPath
   * @returns {Promise<string>}
   */
  async readFile(fileName, dirPath = this.baseDir) {
    const filePath = this.resolvePath(fileName, dirPath);
    return fs.readFile(filePath, "utf-8");
  }

  async removeFile(fileName, dirPath = this.baseDir) {
    const filePath = this.resolvePath(fileName, dirPath);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return filePath;
  }

  /**
   * Append string data to a file
   * @param {string} fileName
   * @param {string} data
   * @param {string} dirPath
   */
  async appendFile(fileName, data, dirPath = this.baseDir) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    await this.ensureDir(fullDir);
    const filePath = this.resolvePath(fileName, dirPath);
    await fs.appendFile(filePath, data, "utf-8");
    return filePath;
  }

  /**
   * List all files in a directory
   * @param {string} dirPath
   * @returns {Promise<string[]>}
   */
  async listFiles(dirPath = this.baseDir) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    await this.ensureDir(fullDir);
    return fs.readdir(fullDir);
  }

  // ===============================
  // JSON File Methods
  // ===============================

  /**
   * Write JSON object to file
   * @param {string} fileName
   * @param {object} obj
   * @param {boolean} pretty - Pretty-print JSON
   * @param {string} dirPath
   */
  async writeJSON(fileName, obj, pretty = true, dirPath = this.baseDir) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    await this.ensureDir(fullDir);
    const filePath = this.resolvePath(fileName, dirPath);
    const jsonData = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    await fs.writeFile(filePath, jsonData, "utf-8");
    return filePath;
  }

  /**
   * Read JSON file and parse it
   * @param {string} fileName
   * @param {string} dirPath
   * @returns {Promise<object>}
   */
  async readJSON(fileName, dirPath = this.baseDir) {
    const filePath = this.resolvePath(fileName, dirPath);
    const data = await fs.readFile(filePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch {
      throw new Error(`Invalid JSON in file: ${filePath}`);
    }
  }

  // ===============================
  // Deep Merge Helper
  // ===============================

  /**
   * Deep merge two objects with options for arrays
   * @param {object} target
   * @param {object} source
   * @param {object} options - { arrayMerge, uniqueArrayMerge, arrayObjectKey }
   */
  deepMerge(target, source, options = {}) {
    const { arrayMerge = false, uniqueArrayMerge = false, arrayObjectKey = null } = options;

    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      const targetVal = target[key];

      if (sourceVal && typeof sourceVal === "object" && !Array.isArray(sourceVal)) {
        if (!targetVal || typeof targetVal !== "object") {
          target[key] = {};
        }
        this.deepMerge(target[key], sourceVal, options);

      } else if (Array.isArray(sourceVal)) {

        if (arrayObjectKey && Array.isArray(targetVal) && sourceVal.every(item => typeof item === "object")) {
          const mergedMap = new Map();
          targetVal.forEach(item => mergedMap.set(item[arrayObjectKey], { ...item }));
          sourceVal.forEach(item => {
            const existing = mergedMap.get(item[arrayObjectKey]);
            mergedMap.set(item[arrayObjectKey], existing ? this.deepMerge(existing, item, options) : item);
          });
          target[key] = Array.from(mergedMap.values());

        } else if (arrayMerge && Array.isArray(targetVal)) {
          let combined = [...targetVal, ...sourceVal];
          if (uniqueArrayMerge) combined = [...new Set(combined)];
          target[key] = combined;

        } else {
          target[key] = sourceVal;
        }

      } else {
        target[key] = sourceVal;
      }
    }

    return target;
  }

  /**
   * Merge JSON into file with deep merge and array options
   * @param {string} fileName
   * @param {object} newData
   * @param {boolean} pretty
   * @param {string} dirPath
   * @param {boolean} arrayMerge
   * @param {boolean} uniqueArrayMerge
   * @param {string|null} arrayObjectKey
   */
  async mergeJSON(fileName, newData, pretty = true, dirPath = this.baseDir, arrayMerge = false, uniqueArrayMerge = false, arrayObjectKey = null) {
    const fullDir = path.isAbsolute(dirPath) ? dirPath : path.join(this.baseDir, dirPath);
    await this.ensureDir(fullDir);

    let existingData = {};
    try {
      existingData = await this.readJSON(fileName, dirPath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
      existingData = {};
    }

    const mergedData = this.deepMerge(existingData, newData, { arrayMerge, uniqueArrayMerge, arrayObjectKey });
    await this.writeJSON(fileName, mergedData, pretty, dirPath);
    return mergedData;
  }

  // ===============================
  // Array Helpers
  // ===============================

  /**
   * Remove objects from array by key-value
   * @param {string} fileName
   * @param {string} arrayPath - dot notation
   * @param {string} key
   * @param {*} value
   * @param {string} dirPath
   */
  async removeFromArrayByKey(fileName, arrayPath, key, value, dirPath = this.baseDir) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();
    arr[finalKey] = arr[finalKey].filter(item => item[key] !== value);
    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Remove primitive values from array
   */
  async removeFromArrayValue(fileName, arrayPath, value, dirPath = this.baseDir) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();
    arr[finalKey] = arr[finalKey].filter(item => item !== value);
    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Update object in array by key
   */
  async updateArrayObjectByKey(fileName, arrayPath, key, newValues, dirPath = this.baseDir) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();
    arr[finalKey] = arr[finalKey].map(item => item[key] === newValues[key] ? { ...item, ...newValues } : item);
    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Update primitive value in array
   */
  async updateArrayValue(fileName, arrayPath, oldValue, newValue, dirPath = this.baseDir) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();
    arr[finalKey] = arr[finalKey].map(item => item === oldValue ? newValue : item);
    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Batch update arrays (objects or primitives)
   */
  async batchUpdateArray(fileName, arrayPath, updates, dirPath = this.baseDir, objectKey = null) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();

    if (objectKey) {
      // updates: array of { keyValue, newValues }
      arr[finalKey] = arr[finalKey].map(item => {
        const match = updates.find(u => u.keyValue === item[objectKey]);
        return match ? { ...item, ...match.newValues } : item;
      });
    } else {
      // updates: Map of oldValue -> newValue
      arr[finalKey] = arr[finalKey].map(item => updates.has(item) ? updates.get(item) : item);
    }

    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Batch remove items from arrays (objects or primitives)
   */
  async batchRemoveArray(fileName, arrayPath, itemsToRemove, dirPath = this.baseDir, objectKey = null) {
    const data = await this.readJSON(fileName, dirPath);
    const arr = this.getNestedArray(data, arrayPath);
    const finalKey = arrayPath.split(".").pop();

    if (objectKey) {
      arr[finalKey] = arr[finalKey].filter(item => !itemsToRemove.includes(item[objectKey]));
    } else {
      arr[finalKey] = arr[finalKey].filter(item => !itemsToRemove.includes(item));
    }

    await this.writeJSON(fileName, data, true, dirPath);
    return data;
  }

  /**
   * Helper to get nested array by dot notation path
   */
  getNestedArray(data, arrayPath) {
    const pathParts = arrayPath.split(".");
    let arr = data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      arr = arr[pathParts[i]];
      if (!arr) throw new Error(`Invalid path: ${arrayPath}`);
    }
    return arr;
  }
}
