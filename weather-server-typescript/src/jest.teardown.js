// Global teardown module for Jest
export default async () => {
  // Add a small delay to allow any pending promises to resolve
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Force garbage collection if available (Node.js with --expose-gc flag)
  if (global.gc) {
    global.gc();
  }
};