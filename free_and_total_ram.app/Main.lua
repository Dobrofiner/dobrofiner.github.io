local computer = require("computer")
print("Made by Dobroposter")
y = computer.totalMemory()
y = y / 1024
print("total kb of memory:",y)
y = y / 1024
print("total mb of memory:",y)
x = computer.freeMemory()
x = x / 1024
print("free kb of memory:",x)
x = x / 1024
print("free mb of memory:",x)