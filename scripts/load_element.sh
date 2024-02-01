
#!/bin/bash
# Directly cloned from the script in elf frontend
rm -rf elf-contracts

echo "Downloading contracts..."
# link/clone and build contracts
# "if an argument was provided and that argument is 'local'"
if [ ! -z "$1" ] && [ $1 = "local" ]; then
    ln -sf ../elf-contracts .
else
    git clone https://github.com/delvtech/elf-contracts.git
fi

# blow away old-contracts
rm -rf contracts/

echo "Copying latest contracts..."
mv elf-contracts/contracts contracts/

echo "Removing unused element code"
rm -rf elf-contracts

echo "Done!"