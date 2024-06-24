from rest_framework_simplejwt.token_blacklist.management.commands import flushexpiredtokens

def flushBlacklist():
    flushexpiredtokens.Command().handle()