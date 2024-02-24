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
v = computer.totalMemory()
b = computer.freeMemory()
vb = v - b
vb = vb / 1024
print("used kb of memory:",vb)
vb = vb / 1024
print("used mb of memory:",vb)