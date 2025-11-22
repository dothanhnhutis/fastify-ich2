import fs from "node:fs";
import path from "node:path";
import { BadRequestError, PermissionError } from "./error-handler";

export function securityPath(root: string, pathString: string) {
  // Security: Ngăn path traversal attacks

  // validate path
  const regex = /^(?:\/[a-zA-Z0-9._-]+)*\.(png|jpg|jpeg|gif|webp)$/i;
  if (!regex.test(pathString)) {
    throw new BadRequestError("Invalid file path");
  }

  const FILES_ROOT = path.join(__dirname, root);

  const shortFilePath = path.join(...pathString.split("/"));
  // chuẩn hóa path
  const absPath = path.resolve(FILES_ROOT, shortFilePath);
  // kiểm tra có nằm trong root không
  if (!absPath.startsWith(FILES_ROOT)) {
    throw new PermissionError("Forbidden");
  }
  return absPath;
}

// export function deleteFile(pathString: string) {
//   fs.unlink(pathString, (err) => {
//     if (err) {
//       console.log("xoá file thât bại.");
//     }
//     console.log("xoá file thanh công.");
//   });
// }
