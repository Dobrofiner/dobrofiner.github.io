import random
import os

os.system("title Console Game")

def play_again():
    while True:
        again = input("Меню реплея. Введите 'y', чтобы начать заново или 'n', чтобы выйти: ")
        if again not in {"y", "n"}:
            print("Введите правильное значение!")
        elif again == "y":
            return True
        elif again == "n":
            return False

def magic_heal(x):
    heal_chance = random.randint(1, 5)
    if heal_chance == 1:  # 20% шанс на восстановление
        healing = random.randint(10, 30)
        x += healing
        print(f"Магическое исцеление! Вы восстановили {healing} хп.")
    return x

def miraculous_victory(x):
    victory_chance = random.randint(1, 100)
    if victory_chance == 1:  # 1% шанс на чудесную победу
        print("Чудо произошло! Вы мгновенно победили!")
        x = -1  # Устанавливаем хп в отрицательное значение для победы
    return x

def game():
    x = int(input("Сколько жизней вы хотите: "))
    while x > 0:  # Игра продолжается, пока у игрока есть хп
        input("Жмите Enter и теряйте хп:")
        s = random.randint(3, 6)  # Урон теперь случайный при каждом нажатии
        x -= s
        x = magic_heal(x)  # Проверяем, активируется ли магическое исцеление
        x = miraculous_victory(x)  # Проверяем, произойдет ли чудесная победа
        if x == -1:
            print("Поздравляем! Вы выиграли!")
            break
        elif x <= 0:
            print("Игра закончилась! Вы проиграли..")
            break
        print("Ваши хп:", x)
        if x <= 30:
            print("Внимание! У вас осталось мало хп!")
    return play_again()

while game():
    print("Начинаем новую игру!")
