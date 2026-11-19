begin;
set local lock_timeout='5s';
lock table public.jwl_catalog,jwl_internal.candidates,jwl_internal.factual_publications,jwl_internal.published_revisions,jwl_internal.term_translations in share mode;
lock table public.jwl_product_variants,jwl_internal.variant_evidence in exclusive mode;
do $guard$
begin
  if (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_base_variants()'::regprocedure) is distinct from '888ba2aea634eb8024fcfd77910bb8e5'
    or (select md5(prosrc) from pg_proc where oid='jwl_internal.derive_product_variants()'::regprocedure) is distinct from '015a9c40282768f21305971c12fa179c' then
    raise exception 'Arabic colour specification derivation changed';
  end if;
end $guard$;

create temporary table arabic_expected(id text primary key,ref text,brand text,revision text,old_signature text,new_signature text) on commit drop;
insert into pg_temp.arabic_expected values
  ('c20e6d52abe1c803bcefd105c3f682e3f95481f1dfa8ec1e1edab8a7ea37850d','A039AS0X02-5544','loewe','28c29d400e09762846bdadefa1d375958fa0bca6c8c08be512267518d85f9098','5f3c33af4a87d2423150b2e66081c53e','37ba97309597343b3cff67ee38431f69'),
  ('163bd309655b6f7105fd2da56f0ca131cee8a91e04f4ecc339775fdf822ed293','A039ASRX03-5544','loewe','c24cb5f5dbae3911239c5200eefa9160276d235d204b841db11398b5aa234cad','0822b48f379acfef5cc689b9822f3d47','5be9bf4d048cac7da55c074bda1a576d'),
  ('50935fd8056cace4281973a255d331a77a527b5ccffe3b62a4d0d3449b916bd3','A039N07X16-3969','loewe','8118a209da0364f973324dc3c7cb5f6fa8508c0cee990ef3d3e39ca04341f4d2','3450deb8801b616d00f1adb0985c2193','fa16ff44c65655f6126fc141b9160989'),
  ('b0b6005f1d8f6af3f6c52a0ed6869bc32da71f2dc84eb57ad35e6fcbf81c5b6e','A039N07X24-5544','loewe','62cecd6d4257c484f7b19440b0a5148d91d45193459ff82580eff89a228654cd','d42a11ae2e6723686228f65afc693846','83040fc942ae1ee66b7f2d7307bab588'),
  ('2843c6a9bf178130e4e8dfb24ba84b30c1bff928e39fc4d19476419d50eb2d73','A411FC1XD4-7240','loewe','7d0b36c72a790963e3aa5b3dc37f37cf7ef3443d2ff4a4943fee20dff8b4b828','0c2efed18958bf05dd26032377c055b4','79a75617d410d491946cb54fc63f41f4'),
  ('c7506b00c9d44051f134b2215d3a8a90985c2ce796975fd5de5a5e91b83c2f38','A411FC2XA6-7240','loewe','9a8180d7e02c55100abfbee278b3dd6765f48d944ffc233fe3092ffcac858841','5a626a084629f36d5a0e409f803bde47','5c75355c8eace027867ca4b9fd015577'),
  ('6067c6df6c84f5cd77d9af4bcf07cbe61c3773223a5b02c214b73e1f937bb812','A411FCRX02-3969','loewe','7f8e930da2d898228286f28d532181d704f144f7c4572006d197e1cf2073bb24','2a68d7aea4e713aa68cca2f168210d53','b61fda557940794ebb512c01357d123f'),
  ('a66c2bfdae16f1a1c97a824c0dcb959da28694415337df79df65b77b20df74ad','A411FCRX02-7240','loewe','c70471555f87900d899b134cf8d3d5a598167e593eb8557decdf64eaf2ca7722','64f50ff4b89d0dc7209c72ab56455a4f','31ef646f58fea6708c9dd111b1822190'),
  ('ab00e5f21b12a651539fedc1e414a7969afc87376854f0eb6e1489ca37f58d39','A411FL1X18-3969','loewe','ef2cb1e4098e397c7ec7c97cd8007e1e885fdbe6dab1e67c1fc8ae49d8849480','8cfb3da16bed46e1128fb88710073831','e945777e80dbe4dc444f83eb74c999c2'),
  ('08c068559c88d406227b227f9faa0c8d0b7a720adc3f521e647b814633767f67','A411FPDX44-7240','loewe','a6c5f3ebfccaf01bcb3fcebf37f510d00431223d6eb8d99ab6e25ea2fc79a7b3','479e15530b57b46184133c109b40a13c','82d12d67df84029a571e85ac84b2c08e'),
  ('f79af2b739c9acc9f1b9f59ca74ac74514611357191b0a3c635656fb78d3b11e','A510P49X26-5544','loewe','1e8f09f9f1a24438ddc4807d1cafb6b8b32ab4d741960eb5cea210ad617e06c0','69fe794cef78e49746cd7a3e1a0dbdf4','f19c61ae94949b272730b68913fe1d30'),
  ('bfe99f090c7eb730ef2c4a34ab776a8523e4b92476c52b74e3d991bc4692e335','A510P60X41-3969','loewe','9dd3f26715190725f5b94400ff20f260c7b9e4fa749b3948d82d169fa3c8dbf5','1023adf04464dcddcbf1671e339fc6a5','108f5bf906ec433ebd66db5f0ba1bc3c'),
  ('e670b2d5591a5e62c2d91bb9bc7d7e37d5bea28a0d7c67280a2d6d03af5f29a9','A510P60XAC-7240','loewe','b8233c3ed9e1be7431f69714e880fad3e987fe16faa5a4686120f68fe7ef9743','9d40938cc4a322abe1c165f6dbdbdb3c','408abe600dc29fab463ccf587aac4b50'),
  ('3d61b503924cbda23d81d2170effdeb79571bda4946fc7725dca85509cd21e65','A510P60XAW-5544','loewe','4600a086cc922866018e95937cd5b45152ad0162bd43f416d0f9cc30b944b331','46d1a4a4bf458e7f4ce1527b4ccae2b0','4096df242dc115549dca5b74697ee175'),
  ('d197f0a3b9ced2744ad3aa00880eccf85ede6899af0f598739844ceb16befc1d','A510S21XDA-7240','loewe','20e7a4d7141cd3ddee759574dc18f8b9ecfbc62bef10886624441203c8f2da90','da62a72f560069078532d81d1801d51a','c00dba62168a57a1da0a20874b7c22d8'),
  ('dffbf4a4b7d23bf1822878e4963d642c09e010b816f1ecc7245cf9329a69c4d9','A538H13X23-5544','loewe','2d4f60817412f65e277bbd0d65e9f4c867fd1011282d98cf4d0758a5f1769ea2','88cb6e4d8ac730a62a8e6d8ac9d2e4f2','8931fb63daa99a419be6043ca33c3f0d'),
  ('6f67333276e2b34c617ac9d93ecd762e33a6cc15995924333d2a2f77c349a655','A657G50X01-7240','loewe','a386d746e7f391e8649911b9daead9774583f294c9c42f094206cbd74307f5b5','8a28a2ece59350cb4f14a186ee23568a','1569d94a99f4e9d107788004bcebbee3'),
  ('f484b31d9a2e2c25e20ca7ce7e704b5fe58603eabed6699fa98199444c0e8f26','A685B61X01-5140','loewe','98b934eb4c16de96492ffc1f7c66df14521ac2369adce33f489e3c7e16543c1c','6ed0afe814be057be710fc4bc875b3f1','e4408210da3182f9c02767e847c426b7'),
  ('11100880ba5236181a341e43e2d13d388c616ffe8798c52d9432fbaa6f50a52b','A779PEWX04-5544','loewe','5e38e3d65b777ff46f3a620ead9cb82396f92a05d4fc20523366b7debfa33941','f342d898bfc4041171f9714a47108e25','fedda9d72ba6fdac83151360855e3215'),
  ('23409af8834ebbd6e5a253f9d3220aee28d7c6498826f489386c159866181821','A779PTWX01-5544','loewe','336323324088f275417d1b5ade26e1b261f100b268075a8124efd03906074df2','13e7f3d52eef2d0d061482b66817069f','e665683e2cdd641a57e84d83568271da'),
  ('43fbc7fe7dab53a6852a45d3df99d6ac87909e9d46fd44f848b1437521f00907','A914NCHX01-7240','loewe','59e24550d81564372321254d283093494adb91142de49e03d96b71b69885f193','7a547234551516bad95384b9951108c8','64a255ae12e101879b37704d099aa346'),
  ('97e339c4cf0018feeef3393d3beef650c60ee38621cab5955dc840c0bffe6a72','A914Q37X01-7240','loewe','94b256cd6a69277044a9cca45e10f4b7381d3effa8c0e2dbd08296529dbca492','f4b04c38bd26d602c86cb6cd56ffccdf','03ac98a730760a13964c0bde90e3c8c4'),
  ('8c8843cdeb48e55fa2b0d1f71f3f9f513740c3343310f8b8fd291ec9310d2a21','AANBAB1X01-7240','loewe','5531fb9d4b884c6e1db09027f9a3f84c56685b4e25393535ff14558c3c6525bb','ec452ecec47134c8b972a74e07927afe','95fc8255976595d6b4ea7977af6e5f56'),
  ('c97d70386e6cda3cb674adc33e7201e9871de4bea6ed88cbb2bac14549c349b3','AANBSPBX01-7240','loewe','c1a4d5e678f2efa8c1a099fa8c21db0a5c59ef3a61722880a80448db4b108951','fcec806d747d4ab528baf32b69ae74d4','f90700096aabb0571206ad50e29d3934'),
  ('e7d90586adb6878dbc2f94faacd3deb07c014a607863a0b4ad712b84be734958','B039AMDX04-8618','loewe','a338739dcaa15116b379ab0d1cdb57b49da553a9f6a0e69469e01bb15a75618e','3b18c0c0753c91403429b69ea1e81147','caa87a50f3ea07ddd8c78e5faaf4282b'),
  ('ff9b170033e016669f73b9b981834428a9fcccccbc65887d3129e662b9600ba4','B411FLKX01-1220','loewe','4d452d4359be296ce0f50b0d221ca7332088e7cda346e9f47a1c14091d3d34ba','327c9eec343c33d20eb3f02e2d5d4466','edd0e62ca0a5a0e737860e3dee433e58'),
  ('b03f7e8979350f35a890e2a2ea49ba9aa84a5afa8f5d874665e9ea93f4b57331','B510PNLX03-1220','loewe','1918386e87650c0a44c3a72098b87de55a0b4f7863dcf49349a7fe5508ed29da','590c83b34876c36b0ce17f0d93b35a99','0f677d7a42e1b5b11e140673cc7a16c2'),
  ('72445bf8561543f87df86dabe5f4724c683c40b740594e0c45b5193e09dca39c','B510PNLX03-3969','loewe','eaf7313e567eebe70673ea2257b99bb9d8ab6639ec8e2b6f241d2efa97abb0a6','2dd070494655c8d0d2d304c699456137','7c7bebc8805bd0d09300e1dc3b932565'),
  ('456feb4d69a23ef7c7a494fde45625e68a38c5101bedbefe7bd41fe539ffe464','B510SEBX02-1220','loewe','6939c39ad99361ba643b16f6ffa5d713d325c00b072eb5f1b3b3679cc123e3eb','562ca8395cb960bd10d2936bc0c53139','d7ff34ddb8d47f3de63a0cfae8b3b456'),
  ('bb5efb6527ff710837ad5f2931e07425a84ab3e6e2fc1612df4899b553b2108e','B933Q18X01-1220','loewe','fb6005f6e1d1221ec13b95a4531668150ccae8b958963add89e9890a50fae2e8','8ae833586c6edf9c36f4d86061a80371','8c4710e613832dd173fd29d8136bac69'),
  ('df416f41a7a7d8bbb15ff05806b792c6478c4d3485637b357b2256aace71b957','BANBA73X04-1220','loewe','2e12b195482e3fe9dfedcf5bc1490aa48e4111ec7e42e694571a3e0f218d52ed','3776f6f0ec705a4c12d08bfbc4725ed6','2c848120b914cdda42c917ba5bf1589c'),
  ('4d6a49cc741d3d5a8d17113023184dc36a995f6076c5faee5eab48c77a42c24e','BANBA73X04-3969','loewe','f9470be53b92501ff2b52aa7ba444f4adef401325297af28b661de2511aec4fb','0408b4b0ea9e4336ffd302f0ab79f335','c40464c9745c95df6adc940a10329e14'),
  ('9c21ae053a09f1646e5ea6d524b95c486df8dd74bf6f6a83fbffe318f9cc9fdc','BANBA73X08-5544','loewe','bbd05c61a65c9b6bcd63aa413425575b02c98b533a5b968d738e2d312085b2da','a0720ef418d1f5ca95a3ed484b718e97','5a9d30babfd911656ff5f7c14ebcbb36'),
  ('43041ad9d866caca5ce76f421117317dcefa12919fe822a980971d03df795c5f','BANBPCBX01-1220','loewe','279454f3e18829aff36f59dbccb4a5bb246611f2323e297c165213c95795f3c2','096f4eafb730ec84ca68c0acf4840838','d7a4fdd6c6b7ba1970cc76c0d77aeb16'),
  ('1339b75153adf035bf490779dbaf480b2259660473cdafcd48644510c26bec0e','BANBPCBX01-3969','loewe','7c435f219c91ccaa956e8189756cba446a0aaccd6ff052ea2156e1bab7bc047e','44f8955d2ff98714f55376545cca4117','ecb10b8a870d95e2476bff2d9dd80b27'),
  ('e544f5eacfb1275d1ad2b2b9e1be48657aab654f23791dbbc1b4f4947cebb1b4','BANBPCBX05-5544','loewe','6889592925ded85a01d83160c9ded2de36f8fde79c2ba3c5042ce9ca98830805','38bd00fa875fbd5584cbbd886bda18c4','f53b5f621d35efa70dfc31d767b49a73'),
  ('ea35dbfd87899f50478fd6d19e26c389e1c29a9609d7ea1a020b4d23bfb6dc2d','BB22CMDX01-3969','loewe','4744a3f7a2f31fb243200c3658c9b7854485a9883eab0e895d30f41f8f82a087','d82c1e2bf0558be678a8b7f17df72d93','4fd6335799d90e338418459bc42c7efc'),
  ('33c20636f75f242bb6fcd0a41a495836984cd44ec9b2dcf84a1de5c964ef6465','BB22CMDX05-0360','loewe','cc080737d81e52a2fc2073dcbf057e76e01057df136f3025c4d9ea9d4f4eb6db','1a01cc51da27c3515b41aea2eec5597a','75239215b72659a345395c6fb16c2d61'),
  ('6f161d027d3daef64415599be9d9d675e09048b66752b7088dadbe4559bfae35','BB22LTTX01-3969','loewe','86e72575c4104a14c1583ee437a91640a0583c2cce1d7867435c0e9ca3ae4fea','73f1752270d1e9f85849f50235e0a9d5','4f2b84c925a98925ac4f2818bc5fe485'),
  ('24dbf3d159329a54dc58abd37378ebb9bd07cc7ede03923def9c3fbb99801c42','C510302X16-1220','loewe','478aa98c33b7eeaed7e35d12e726d92ceb8702472e6f8f0b948780230b7254ce','536a1ac5c2134e99727191cb7aa8c329','9eb4fa86bda35d5e104fd2f9080b3d21'),
  ('9ade66bdf891e1402fe82dfcf3b5ccf5bdd7da495ca17444fa32adaab113c862','C510302X23-0362','loewe','cec320d6c9f25f00fe3e781e1f1871b8f8f103472a5848877e36b92b8f9f8fb2','acfe8b292b133789b24dc1c7568c933b','b65e25650b48f6b6da91e4ac4841aeee'),
  ('466b8a9be5975fadc07ca09699d265ff18668dbdb001e4fe772afc26ef561012','C510302X23-1220','loewe','da36f9240a949cceaa2d528d323c33d712b0f5cf29803af1581be7ed6f85ac1b','2268b82ce8a0c21b4b6da2beb852db1b','a6664920e80bdced0a52ce85c329f589'),
  ('409ac2e15df874ea49d20b518497c3bc8d7ddfec929a9da86bab9a3ab8edc58a','C510501X14-1220','loewe','19c5f265e37b90960a32240fcf12f0a23f0660894d33dddcee5fcf83cf8cd9d8','eb87de47936daf51363e18c090c0c0bd','27aa695bb2ecbd42690910846da38e17'),
  ('6d344c273efd0c0c373d83a3a2695334d3e8c2a245e2eddfca18fbc7084869cc','C510501X18-0362','loewe','4508f2d15ba845e4cc5a12735cee5da6cf435fefad0c9ebb87ff46b327200761','8c38a7e8ab8ea2914f2c730d35f02813','2459b015c2970d93c36c1037c834f145'),
  ('ffb98c8bdb6269c1b5def60988366360fc0f8db18a05f161086fbc596569262e','C510501X18-1220','loewe','f524e2cdaf63878e8ca413a69ead71650d803a18f91769a14309b886104337fb','0f6661435c2b4bcc1f334bcfe3d0087a','a49f2b22a1caeea7c84e2543b619e5df'),
  ('eae80b1091042d84fcddbdce96a2aaabe2786e3b80de818114ea75b9999af315','C510W73X08-1220','loewe','dab24ed2dad40166360115f5a0a0a475165d9aa171c8e3b290078fd2d4ff0c27','d395206a2b5f077c6bc8e52876306bdf','3f7fbb104150f7750f77d27c63feed37'),
  ('0ac0e193de78702684fe58a8886c62d00e0da3308599e2a6d42ab02b2c897a81','C510W73X08-3969','loewe','82a71a4f8f4659e3fe2e134ef8e3c854c3133f2a50d5c33efed67417b5f38add','78aa48da0b8a6c3e9dd49bc7405ba04b','43ecc390d1a38f9f82eba0535249fb07'),
  ('f79a991cce6971f208067a7b0ea658526a3979e0a34410d7c3387467674747da','C510W73X16-1220','loewe','72691744cbc594de05f9438ca81d2d389d9632d1d73a27601a60e92ac8ff5c23','8a0f2115cba5ef28909a80629ca1ee44','fce8152aa30dfc9e14d1fc8cb8dd4761'),
  ('1cd32d4bc524556b560bbcbc7179dd9383c875ae2c6c5d62da358ea3e4a2b185','C565R41X04-1220','loewe','ec02c8898b648f3264949226079becbbf6ea26b02cb589ba1427b4708228e249','c7d6c239e8d014f27b7f738957d2a5b4','f4c9c3aec459520874bfc81660126a12'),
  ('f31e7ddd5cff15ffe4ab28454e899348142032f8c6d1581eaa287078bf1a0b9e','C565R41X04-4160','loewe','a6e93c81ede155e049548def82ecdc355c0c1f6c48413fc2527452ff1aa0742c','331e3aa009fc0dd198187360d35b0fff','a69630ed2ce4cf265f30eed6f555c661'),
  ('4a78758ea39023a2f3205175b1c6a9ab1ca7e05af4a89c49a26805e3dfc6608f','C630R10X03-7240','loewe','40156e2c3268140095ac56ace7accfdc6ffaf068c6bfb557bc1069fd1d6378d6','5a89f0b5adaad1e795ae1a9c0b47cf3b','8da748ffef2ce8643d79d17b71658dfb'),
  ('f2c4155519a40eada51034b027e7e6fb6caff8888c041c62fddf4b7254e9c4d8','C660R41X02-0362','loewe','24edd704a509c8f9c5bee2019e3afcadc25cbcb1ef34e8d3ef31ec0bc3e9dbb4','f86f7943c4b01a85b1900a3721188674','8622c0d64cbaea76d3985f92dd6e2a48'),
  ('ada742ea1b4a16fd78a47d8ed36adca89bb7669ad134ffb3415b3298846e93ac','C660R41X02-4160','loewe','2c4e31be542d773231c2f0894e75ddf68278528d9955abe1caf567483516c5a5','74d7dd281c88739dfe4a70823da6c2ff','6ccbd0a993cfbef43d366538cefa317c'),
  ('8cc3a9277cfbba53e9e8f5a6308eea294789b05f226444526456374523b9c371','C660R41X02-5544','loewe','fc21ab36b4007e0b1bcb1626cdc6c6fe3cb03f278e81c6ea3892beadd346de5d','550029bc7e514e076fe1c1fe3bb65e98','7d4363a9edc6e07a5cd36280d6ac3b4d'),
  ('086a846115bd9cf3c9a0eddc467a36cdb3a1649becc190f892c7a6bcaf03fa2b','C779302X02-1220','loewe','9997aac25baae437712bb4acc6ab3a10f4da96603625d34514fdad318f0b8cf1','0682ac74a68ac4ccb0a76b5260c2e24f','8b66da4239fe7e11247bd5bbf8f6dac0'),
  ('d5785e999d31164c724636c087dc954b97a8d7bfaa6f4da2cbeb7561c0e565b8','C779302X02-3969','loewe','ddb282f38eec57b3421357494f5c8c4b7b627bca3663aeac4c7d16f484b152f2','ca17989fced55160ff8df05cb0d35dca','54fb892431bdd66a885eef913be9332e'),
  ('116a5a8367902262de25916f80d226bd34232b32a1ba86626959c0d9160609a1','C779501X01-1220','loewe','de657c32fb64a8c30ad737888c8adac56e9b793df7741d63460d25bc15b0d563','9e32ff85337307bc5a077e86006a6ed0','fab9007beecabc80afe7d0991b1c4dd2'),
  ('46c1a0ee9d886fc4bbca2e254f532e349c9747e6e437f4d54bab903aa32f9541','C779501X01-3969','loewe','3b227e0cdf042794cd55e4f60af979371f3c888070c05728cebb483229db59d5','0c83875740faa712c9e96672bd9e2fd2','2fd69119662b9fb8fb8a63f62c627d60'),
  ('8752cdd02788933cae2a9ccaa6f1ae35db21db92dac3039e3723f2e925161e47','C779W73X01-1220','loewe','cbb57d277528799b4e5f636986d4079e122a0a8d387074fd6ab1232d30985201','3741b89fbdd8bc830a67c93f8fcca02a','27dea9bffbc4fb007817be1504875c26'),
  ('3161eb80ab7388123d6716a303d5e21567f45c3aa9c228ef97b5625a85f0e4c5','C779W73X01-3969','loewe','37eb6ff5a11f9f17f2b1326741ed2d3d7ef5754f8bc1b7e38e1e22e16be1080a','809d4cccfd5b9fa605e64516784a521e','faf2d345ceb0488a500dc8665e50ce3b'),
  ('a0caad674dc33d2c841358c71451d390b7504f89e976659801ddbd6c089c041f','10166HSR892','longchamp','600a2a9ddb25f19fad6e3bc4306510d3c089ff9964db21748b908d847691a5bc','c97640de7603e9201f71910b6d5f8042','fe6c9380bd57f51309cb5e0040bb878d'),
  ('5295151615c5d010d3794210b09d85ba9b5c8d38fded912652cc77293b1a9de9','10197HCV292','longchamp','b846665b6c87fbb5b15826d3f19aba4c7e14519c95225697df0702a68b001754','775af3a2fff081f31766eb6e99ea35ed','1546028fbb5ac0bb010c8964653cfa99'),
  ('16ce8028851e63af8009016e6a51558a54093b388779c0d6247110324d896ca0','10215HCV292','longchamp','00c170df65d98fd33be71a2af13ea3870b1ad4fc5672a8f233b3f6743cf117eb','ce106e3ffdad3091d72c7c4541865229','90a7c431520e20a6f6c95a246cd061f5'),
  ('3b53c95a5289d3c32587a463ec2024a9fe76ec071bcd534f918135ec35f7a8b0','10256HSR892','longchamp','f67c0760c2b917378e545bb6b2ac8c57dc791a7c16a7ad30ff579d59abcae90f','14d1250de6e9eb647ec4aa58b06139e6','bc6ece6289c154f6ef45a7a52b07008b'),
  ('3c99aa9a57c65bb37f837d9f2f9ac730de0e9883911724ba73155c847cadf3aa','10321HSR892','longchamp','15edce5e0342c2ea4b49755bf663d9bed06b29c886512311a611741188bebbe2','e82f9bc7942d3033410910ab4bbe073e','b6e8193bdd10dc84d339a8c9144cde6e'),
  ('2bf40dc3f83df5581be5fe293bb073fcce1e1cf2079ff2999169958fd399422d','10328021407','longchamp','ea6209d9ed517c8053b217f15573775b6827aa352d18ddfda76de9b99f26e3cf','bbbb0a5b4b3b0b04314990f2ab9883da','90c878a8e6a62ff78426518959aff870'),
  ('280616423a352a3bb034c07551d4675eed359b7a154f13afa1a2f6674f3e4d8f','10329021407','longchamp','238486cb5dc1938226d51ac374585b789ead9e71b3248b1f6f0ab948a50823dd','503781152f0f74d8a71c53ca213758e4','2c74f15720688db3da8f340d38ceb782'),
  ('69c0ba4903881106998cf002f9d2e4152bb06b0f2d2ea2e84b33d0abb9911f55','10337021407','longchamp','ec612ea6386ba83caa0f20fec8fd6ddf11027632054d2658e467cd45207cac6b','9ca0c98b57c28a830d7171dc73578033','571d082014a27d73e1d8e678f8da2017'),
  ('20f07b2d4aa4e6fa5fd43c8a1ce8f1b0c8a04eaef80946cd31dde335ed2c37a5','10343HSR892','longchamp','a443b5cbdbed62ae7ed91d3e67d6dc3b3476d5369c77d82a494b8ae566d9c6f7','7f3c365e1d149c4fb2295609eae89f98','ef42764fa1ece6a993f35bc422e2aacc'),
  ('c35c6024706d4667434819124028ccfd13c8b192d3c6b4f5e837ddf3a1b73c92','10372HSR892','longchamp','e302d05b67b1335776ffdb8113424b97ef1548fb372f60fe5f591a0b443d8f00','254ab80214da2beb84ef6bf465a36c71','6aea88e238917839a6eba4bef55be622'),
  ('0c77f6e843ddfa19e3c4b4b9d6ee76e9fffd00fb8d9cd0e37bfeea7321cd2e42','10372HSRE98','longchamp','7767d70648d5d4f75469ec93726cb6eca565be28e4ef5828c3562d57b43f0a73','c69132ad2f89880b7ad97b2c8e872ecf','23d84264b19d1b345285ea18d92693fb'),
  ('28d62375112c0cc15a6da562708fd225a2ea2c54e92e6e02a03d95a2aea8ffbd','10373HSRE98','longchamp','21c99ef388357b84f9320d0b22e354763ef6c6f83f2e353b4f2f7f6ffa5973a6','0b32f052ced0f80510862335cd9baf29','daa8e5353d7e2dce729dc2075aaa9030'),
  ('780887ff6c878a27d7ee3a1186d63480eab8f424d560e7db7e81cdd9a3059a9e','24024423892','longchamp','f3f4b35794361fdb9b4cc6ff19f1cdb216af2b33afc226eeb56810151a231690','c2cc0ef9218be9a9ca8d26ab16c65bdd','86e922c0c36983ec5610651f93131e5d'),
  ('ae476048c26619c55a289235ac898dd730e562915efb917fec5a292918c30faf','70203PVC292380','longchamp','27dae42e248ee444798473d61ba6cace5fb6a1c59d6fa2cee27ad5217dfc7d0e','4c0049f94a6d9f942c6c71b288674870','fef9e1dbdd79cfbefc5358b264a0bbce'),
  ('7669ab2d49cb8ba56efc9a8ccf3644fc8b6b4ca109731a0ef4baf0a639679d13','L1512HSR892','longchamp','492a4f45262c733855528704adea1aaea5be84d342aed44a1a020faa6de99a03','e85fbc732263ed9b34563e4f27cda56f','fcd430e7a597eb036a893bfe36eb16aa'),
  ('6a220167aac31c0bb704481e8352e1b5edd6e9e37aba7d4b800868b089bf5c77','L1515HSR892','longchamp','ec55881c282879731817ea50d3c1cd1dd8b291f1a0cae90d9bda5b85d0605c9b','0387c45c0d0428bc9dda253208781e12','18aeb5d9ff2256b63397d2e6bb693375');

create temporary table arabic_before on commit drop as select * from jwl_internal.derive_product_variants();

CREATE OR REPLACE FUNCTION jwl_internal.derive_product_variants()
 RETURNS TABLE(product_id text, model_key text, is_primary boolean, "position" integer, model_name jsonb, options jsonb, specs jsonb, rule text, candidate_id text, revision_hash text, compared jsonb, basis jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with current_result as materialized (
with original(product_id,model_key,is_primary,"position",model_name,options,specs,rule,candidate_id,revision_hash,compared,basis) as materialized (
with unchanged as materialized (
with original as materialized (
with base as materialized (
  select d.* from jwl_internal.derive_base_variants() d
), base_models as (
  select b.model_key,count(*) n from base b group by b.model_key
), rows as materialized (
  -- Only a cleanly mapped row can join a size family: a grouped model, or a single with nothing wrong. Facts come
  -- from the base specs, which hold only the exact published revision's facts.
  select b.product_id id,b.model_key bkey,b.rule brule,b."position" bpos,b.model_name bname,b.specs,
    p.reference collate "C" reference,p.category_slug,p.collection_slug,p.name_en,p.name_ar,k.source_id,k.content->>'source_description' sd,
    sp.diameter,sp.diameter_ar,sp.material,sp.colour_en,sp.colour_ar
  from base b join public.jwl_catalog p on p.id=b.product_id join jwl_internal.candidates k on k.candidate_id=b.product_id
  cross join lateral (select max(s->'value'->>'en') filter (where s->>'kind'='diameter') diameter,max(s->'value'->>'ar') filter (where s->>'kind'='diameter') diameter_ar,
      max(s->'value'->>'en') filter (where s->>'kind'='material') material,
      max(s->'value'->>'en') filter (where s->>'kind' in ('colour','dial')) colour_en,max(s->'value'->>'ar') filter (where s->>'kind' in ('colour','dial')) colour_ar
    from jsonb_array_elements(b.specs) s) sp
  where b.rule not like 'single:%' or b.rule in ('single:only-variant','single:no-linking-evidence')
), named as (
  -- Names without the reference and, for a single, without a recorded colour tail, as the base rules strip them.
  select r.*,
    case when r.colour_en is not null and lower(right(x.noref_en,length(r.colour_en)+3)) in (lower(' — '||r.colour_en),lower(' – '||r.colour_en),lower(' - '||r.colour_en))
      then left(x.noref_en,length(x.noref_en)-length(r.colour_en)-3) else x.noref_en end core_en,
    case when r.brule not like 'single:%' then r.bname->>'ar'
      when r.colour_ar is not null and right(x.noref_ar,length(r.colour_ar)+2)='، '||r.colour_ar then left(x.noref_ar,length(x.noref_ar)-length(r.colour_ar)-2)
      else x.noref_ar end core_ar
  from rows r cross join lateral (select
    case when length(r.name_en)>length(r.reference) and right(r.name_en,length(r.reference))=r.reference then rtrim(left(r.name_en,length(r.name_en)-length(r.reference)),' -–—:,') else r.name_en end noref_en,
    case when length(r.name_ar)>length(r.reference) and right(r.name_ar,length(r.reference))=r.reference then rtrim(left(r.name_ar,length(r.name_ar)-length(r.reference)),' -–—:,،') else r.name_ar end noref_ar) x
), sized as (
  -- What each source states. A regexp_match that finds nothing still yields a row (NULL), so each branch requires a
  -- match. Rolex: the case diameter fact, the model line without its size, and the case type, case material and bezel
  -- that the source description of the exact reference states.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size' size_kind,n.diameter size_en,n.diameter size_label,n.diameter_ar size_ar,
    split_part(n.diameter,' ',1)::numeric size_rank,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[4],m[5],m[6]) design,nm[1]||' watch: '||nm[3] neutral_en,
    btrim(regexp_replace(case when n.diameter_ar is not null and right(n.core_ar,length(n.diameter_ar)+2)='، '||n.diameter_ar
      then left(n.core_ar,length(n.core_ar)-length(n.diameter_ar)-2) else n.core_ar end,' '||m[3]||'(?=$|،)','')) neutral_ar
  from named n
  cross join lateral regexp_match(n.sd,'^Discover the (.+?) ref\. (\S+) on Rolex\.com\. ([0-9]+) mm (.+?) case in (.+?), (.+?) bezel, (.+?) dial\. (.+?) bracelet in (.+)$') m
  cross join lateral regexp_match(n.core_en,'^(.+) ([0-9]+) watch: (.+)$') nm
  where n.source_id='rolex-official' and m is not null and nm is not null and m[2]=n.reference and n.diameter=m[3]||' mm' and nm[2]=m[3]
  union all
  -- LOEWE: a leading size word in the official name; the rest of the name and the material must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[1],m[1],t.term_ar,
    array_position(array['Nano','Micro','Mini','Small','Medium','Large','XL'],m[1]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[2],n.material),upper(left(m[2],1))||substr(m[2],2),null
  from named n cross join lateral regexp_match(n.core_en,'^(Nano|Micro|Mini|Small|Medium|Large|XL) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=m[1]
  where n.source_id='loewe-official' and m is not null
  union all
  -- Longchamp: the size letter between the line and the item type.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,m[2],m[2],null,
    array_position(array['XXS','XS','S','M','L','XL','XXL'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(.+) (XXS|XS|S|M|L|XL|XXL) (.+)$') m
  where n.source_id='longchamp-official' and m is not null
  union all
  -- Prada: a size word inside a named line ("Prada Galleria small ..."). Prada records no colour names, so the
  -- reference's material and colour codes must match as well.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,case when n.category_slug='handbags' then 'bag_size' else 'size' end,initcap(m[2]),initcap(m[2]),t.term_ar,
    array_position(array['nano','micro','mini','small','medium','large'],m[2]),
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],m[3],n.material,split_part(n.reference,'_',2),split_part(n.reference,'_',3)),m[1]||' '||m[3],null
  from named n cross join lateral regexp_match(n.core_en,'^(Prada [^ ]+(?: [^ ]+)*?) (nano|micro|mini|small|medium|large) (.+)$') m
  left join jwl_internal.term_translations t on t.kind='size' and t.term_en=initcap(m[2])
  where n.source_id='prada-official' and m is not null and n.reference ~ '^[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+(_|$)'
  union all
  -- Cartier and Van Cleef & Arpels: the maker's "<size> model" in both names; the rest of the name and the source
  -- description (its materials), without that phrase, must match. This is the maker's model size, not a fit size.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'model_size',lower(m[2])||' model',upper(left(m[2],1))||lower(substr(m[2],2))||' model',
    substring(n.core_ar from '، (الموديل [^،]+)'),
    case lower(m[2]) when 'extra small' then 1 when 'extra-small' then 1 when 'mini' then 2 when 'small' then 3 when 'medium' then 4 when 'classic' then 4 when 'large' then 5 else 6 end,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],coalesce(m[3],''),btrim(regexp_replace(coalesce(n.sd,''),', '||m[2]||' model','','i'))),m[1]||coalesce(m[3],''),
    regexp_replace(n.core_ar,'، الموديل [^،]+','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), (extra small|extra-small|mini|small|medium|classic|large|extra large|extra-large) model(, .+)?$','i') m
  where n.source_id in ('cartier-official','van-cleef-and-arpels-official') and m is not null and n.core_ar ~ '، الموديل [^،]+'
  union all
  -- Van Cleef & Arpels watches: "<name>, NN mm"; the description without that diameter must match.
  select n.id,n.bkey,n.brule,n.bpos,n.source_id,n.reference,n.core_ar,'case_size',m[2]||' mm',m[2]||' mm',jwl_internal.arabic_measure(m[2]||' mm'),m[2]::numeric,
    concat_ws(' | ',n.category_slug,n.collection_slug,m[1],btrim(regexp_replace(coalesce(n.sd,''),'\m'||m[2]||' mm\M','','g'))),m[1],
    regexp_replace(n.core_ar,'، '||m[2]||' مم$','')
  from named n cross join lateral regexp_match(n.core_en,'^(.+?), ([0-9]+) mm$') m
  where n.source_id='van-cleef-and-arpels-official' and m is not null
), arabic as (
  -- Bag and leather-goods names: the size phrase or adjective is removed from the Arabic base name.
  select s.*,coalesce(s.neutral_ar,btrim(regexp_replace(regexp_replace(s.core_ar,'، مقاس [^،]+',''),' (صغيرة|صغير|كبيرة|كبير|متوسطة|متوسط|ميني|نانو|مايكرو)( جداً)?(?=،|$)',''))) nar
  from sized s
), per_model as (
  select bkey,count(*) parsed,count(distinct (design,size_en)) shapes from arabic group by bkey
), complete as (
  -- A base model joins only whole: every member parsed exactly once, all to the same design and size.
  select a.* from arabic a join per_model pm on pm.bkey=a.bkey join base_models bm on bm.model_key=a.bkey where bm.n=pm.parsed and pm.shapes=1
), per_size as (
  select source_id,design,size_en,count(distinct bkey) n from complete group by 1,2,3
), designs as (
  select c.source_id,c.design,count(distinct c.size_en) sizes,bool_and(p.n=1) one_per_size,count(distinct c.nar) ar_names,count(distinct c.neutral_en) en_names
  from complete c join per_size p using(source_id,design,size_en) group by 1,2
), members as (
  -- A family: one design, two or more sizes, exactly one base model per size, one English and one Arabic name.
  select c.* from complete c join designs d using(source_id,design) where d.sizes>1 and d.one_per_size and d.ar_names=1 and d.en_names=1
), option_cells as (
  -- The family's other options: each recorded option fact of the source that varies within it (as in the base rules).
  select m.id,m.source_id,m.design,u.e->>'kind' kind,u.e->'label' label,u.e->'value' value,u.e->>'value_lang' value_lang,(u.e->'value'->>'en') collate "C" en,u.ord
  from members m join base b on b.product_id=m.id cross join lateral jsonb_array_elements(b.specs) with ordinality u(e,ord)
  where u.e->>'kind' = any(case m.source_id when 'rolex-official' then array['dial','bracelet','bracelet_material']
    when 'loewe-official' then array['colour'] when 'longchamp-official' then array['colour'] else array[]::text[] end)
), varying as (
  select source_id,design,kind from option_cells group by 1,2,3 having count(distinct en)>1
), need as (
  select source_id,design,count(*) n from varying group by 1,2
), have as (
  select o.id,count(*) n,string_agg(o.en,' | ' order by o.ord) vals from option_cells o join varying v using(source_id,design,kind) group by o.id
), checked as (
  select m.*,coalesce(nd.n,0) need_n,coalesce(h.n,0) have_n,m.size_en||' | '||coalesce(h.vals,'') tuple
  from members m left join need nd using(source_id,design) left join have h on h.id=m.id
), unresolved as (
  -- Every member records each varying option, and no two members carry the same size and options.
  select source_id,design from checked group by 1,2 having bool_or(have_n<>need_n) or count(*)<>count(distinct tuple)
), grouped as (
  select c.*,(row_number() over (partition by c.source_id,c.design order by c.size_rank,c.size_en,c.bpos,c.reference)-1)::integer pos,d.sizes n_sizes
  from checked c join designs d using(source_id,design) where not exists(select 1 from unresolved u where u.source_id=c.source_id and u.design=c.design)
), cells as (
  select o.*,btrim(regexp_replace(lower(o.en),'[^a-z0-9]+','-','g'),'-') slug
  from option_cells o join varying v using(source_id,design,kind) join grouped g on g.id=o.id
), keyed as (
  -- Two different values with the same slug get a hash suffix so every key stays unique.
  select c.*,min(c.en) over w<>max(c.en) over w shared from cells c window w as (partition by c.source_id,c.design,c.kind,c.slug)
), opts as (
  select k.id,jsonb_agg(jsonb_build_object('kind',k.kind,'label',k.label,'value',k.value,
      'key',case when k.slug<>'' and not k.shared then k.slug when k.slug<>'' then k.slug||'-'||left(md5(k.en),8) else left(md5(k.en),12) end)
    ||case when k.value_lang is not null then jsonb_build_object('value_lang',k.value_lang) else '{}'::jsonb end order by k.ord) o
  from keyed k group by k.id
), family_rows as (
  select g.id product_id,g.source_id||':size:'||left(md5(g.design),16) model_key,g.pos=0 is_primary,g.pos "position",
    jsonb_build_object('ar',g.nar,'en',g.neutral_en) model_name,
    jsonb_build_array(jsonb_build_object('kind',g.size_kind,
        'label',case g.size_kind when 'case_size' then '{"ar":"قطر العلبة","en":"Case diameter"}'::jsonb when 'bag_size' then '{"ar":"مقاس الحقيبة","en":"Bag size"}'::jsonb
          when 'model_size' then '{"ar":"حجم الموديل","en":"Model size"}'::jsonb else '{"ar":"المقاس","en":"Size"}'::jsonb end,
        'value',jsonb_build_object('ar',coalesce(g.size_ar,g.size_label),'en',g.size_label),
        'key',btrim(regexp_replace(lower(g.size_en),'[^a-z0-9]+','-','g'),'-'))
      ||case when g.size_ar is null then '{"value_lang":"en"}'::jsonb else '{}'::jsonb end)||coalesce(op.o,'[]'::jsonb) options,
    b.specs,
    case g.source_id when 'rolex-official' then 'rolex-size-family' when 'loewe-official' then 'loewe-size-family' when 'longchamp-official' then 'longchamp-size-family'
      when 'prada-official' then 'prada-size-family' when 'cartier-official' then 'cartier-size-family' else 'van-cleef-size-family' end rule,
    b.candidate_id,b.revision_hash,
    b.compared||jsonb_build_object('size',g.size_en,'design',g.design) compared,
    jsonb_build_object('base_model_key',g.bkey,'base_rule',g.brule,'size_kind',g.size_kind,'family_sizes',g.n_sizes,'base',b.basis) basis
  from grouped g join base b on b.product_id=g.id left join opts op on op.id=g.id
), reasons as (
  -- Why a row that states a size was not grouped, kept in its private evidence for the coverage report.
  select a.id,case when c.id is null then 'incomplete-base-model' when d.sizes<2 then 'one-size' when not d.one_per_size then 'several-models-per-size'
      when d.ar_names>1 or d.en_names>1 then 'name-mismatch' else 'options-unresolved' end reason
  from arabic a left join complete c on c.id=a.id left join designs d on d.source_id=c.source_id and d.design=c.design
  where not exists(select 1 from family_rows f where f.product_id=a.id)
)
select f.* from family_rows f
union all
select b.product_id,b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule,b.candidate_id,b.revision_hash,b.compared,
  case when r.reason is null then b.basis else b.basis||jsonb_build_object('size_check',r.reason) end
from base b left join (select distinct on (id) id,reason from reasons order by id,reason) r on r.id=b.product_id
where not exists(select 1 from family_rows f where f.product_id=b.product_id)
), requested(code, pinned_signature) as (values
  ('278344rbr','1818498e4958cefcaa681ffcc19d1992'),
  ('126300','dab0f3e56d78b5044dcf03297bbd6098'),
  ('126303','f6bd6014036bce8a1c5c2fb945759836'),
  ('128348rbr','f21d457004b950bfe2f4784c3aaf17ab'),
  ('128349rbr','fe0f8453c1e3c20945690cd231ca7529'),
  ('128395tbr','f63050937a3c6b2d744ebac491e23539'),
  ('128398tbr','643cb806a78bc47ec145ffde3160320d'),
  ('128399tbr','e8d82433255ce31c9cf3556ead8e198b'),
  ('228348rbr','a21320e3418271543dc895b8000b8ee8'),
  ('228398tbr','239b0daa793dc71bdb82aeccb0a60728'),
  ('278275','cd3537d02a2998086ab9c861bfccabc4'),
  ('278278','8d691c679d4834dc94e6839cf492424a'),
  ('278285rbr','ae9d1e1b1aff5d4ca6dd198299ada2d6'),
  ('278288rbr','21f79397b5ce0ee189e3e461989c9c83'),
  ('278289rbr','dbf50f869ca6a10a9dd76423b22b0302'),
  ('278341rbr','fc03d8ac7be45c591ebf13ca61721970'),
  ('278343rbr','222aebff9c36f425061d4c90371a662e'),
  ('279135rbr','1d2eb977e57af684078415533e957121'),
  ('279138rbr','c78ea3ff3f14a2ebc6757068afb668db'),
  ('279139rbr','a846b79c91be58c087162231c6087dd4'),
  ('279160','fe285449dedcaaa9e85fd53ebc53c910'),
  ('279161','bfe189e637a950d889428cdfa480d0cf'),
  ('279163','b01c0671a2bb0ef96bdcaaec426aa275'),
  ('279171','20282b467ae8996e93183ed097b34264'),
  ('279173','603d9034fac8b260c143a5eabd67e5f6'),
  ('279174','5d412a784840ea2d51a11485b576459a'),
  ('279175','1a06cce027055b4e83805f8a84a3f05d'),
  ('279178','e1ae38b62ccaf28fe51c750b3c84447d'),
  ('279381rbr','b7ae302d2af5c0c89726fbf3639d8e9a'),
  ('279383rbr','8b6582d8bf8219e811ef31bc4f0859e6'),
  ('279384rbr','72fd2ba8a2eae85a17ca4f1937ebed83')
), official as materialized (
  select d.*,p.reference,p.slug,q.code,q.pinned_signature,
    jsonb_build_array(p.id,p.reference,p.slug,p.name_ar,p.name_en,c.revision_hash,c.content->>'source_url',to_jsonb(d)) evidence
  from original d
  join public.jwl_catalog p on p.id=d.product_id
  join requested q on q.code=substring(p.reference from '^m([0-9a-z]+)-[0-9]{4}$')
  join jwl_internal.candidates c on c.candidate_id=p.id and c.revision_hash=d.revision_hash
  left join jwl_internal.factual_publications f on f.catalog_id=p.id
  left join jwl_internal.published_revisions r on r.catalog_id=p.id
  where p.active and p.brand_slug='rolex' and c.source_id='rolex-official'
    and c.revision_hash in (f.revision_hash,r.revision_hash)
    and c.external_id=p.reference
    and lower(c.content->>'source_url') ~ '^https://www[.]rolex[.]com/[^/]+/watches/[^/]+/m[0-9a-z]+-[0-9]{4}$'
    and regexp_replace(c.content->>'source_url','^.*/','')=p.reference
), cohorts as materialized (
  select code,count(*) n,count(*) filter(where rule='single:ambiguous-options') held,
    min(product_id) filter(where rule='rolex-model-number' and is_primary) primary_id,
    min(pinned_signature) pinned_signature,md5(jsonb_agg(evidence order by reference collate "C")::text) signature
  from official
  group by code
  having count(*) between 2 and 60
    and count(*) = count(*) filter(where rule='single:ambiguous-options' or (rule='rolex-model-number' and model_key='rolex-official:'||code))
    and count(*) filter(where rule='rolex-model-number' and is_primary)=1
    and count(*) filter(where rule='single:ambiguous-options')>0
    and count(distinct compared)=1
), selected as materialized (
  select o.*,g.n,g.primary_id,
    row_number() over(partition by o.code order by (o.product_id=g.primary_id) desc, (o.rule='rolex-model-number') desc, o."position", o.reference collate "C")::int-1 new_position
  from official o join cohorts g on g.code=o.code and g.signature=g.pinned_signature
), attributes as materialized (
  select s.product_id,s.code,j.spec,axis.ord,j.spec->>'kind' kind,j.spec->'value'->>'en' meaning
  from selected s
  cross join lateral jsonb_array_elements(s.specs) j(spec)
  join (values ('dial',1),('bracelet',2),('bracelet_material',3)) axis(kind,ord) on axis.kind=j.spec->>'kind'
), varying as (
  select code,kind from attributes group by code,kind having count(distinct meaning)>1
), original_keys as (
  select o.code,j.option->>'kind' kind,j.option->'value'->>'en' meaning,min(j.option->>'key') key
  from selected o cross join lateral jsonb_array_elements(o.options) j(option)
  where o.rule='rolex-model-number'
  group by 1,2,3
), built as (
  select a.product_id,jsonb_agg(a.spec||jsonb_build_object('key',coalesce(k.key,'source-'||md5(a.meaning))) order by a.ord) options
  from attributes a join varying v using(code,kind) left join original_keys k using(code,kind,meaning)
  group by a.product_id
), replacement as materialized (
  select s.product_id,'rolex-official:'||s.code model_key,s.product_id=s.primary_id is_primary,s.new_position "position",
    p.model_name,coalesce(b.options,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'kind','reference','key',s.reference,'label',jsonb_build_object('ar','المرجع','en','Reference'),
      'value',jsonb_build_object('ar',s.reference,'en',s.reference),'value_lang','en')) options,
    s.specs,'rolex-model-number'::text rule,s.candidate_id,s.revision_hash,s.compared,
    s.basis||jsonb_build_object('exact_reference_option',true,'reviewed_model_code',s.code,'group_size',s.n) basis
  from selected s join selected p on p.product_id=s.primary_id
  left join built b on b.product_id=s.product_id
), proposed as (
  select * from replacement
  union all
  select o.* from original o where not exists(select 1 from replacement r where r.product_id=o.product_id)
)
select * from proposed
), reviewed_options(source_id,kind,term_en,term_ar) as (values
  ('loewe-official','colour','Dark Grey','رمادي داكن'),
  ('loewe-official','colour','Dark Burgundy','عنابي داكن'),
  ('loewe-official','colour','Deep Navy','كحلي داكن'),
  ('loewe-official','colour','Blue Grey','أزرق رمادي'),
  ('loewe-official','colour','Light Blue','أزرق فاتح'),
  ('loewe-official','colour','Khaki','كاكي'),
  ('longchamp-official','colour','Khaki','كاكي'),
  ('loewe-official','colour','Dark Khaki','كاكي داكن'),
  ('loewe-official','colour','Light Khaki','كاكي فاتح'),
  ('loewe-official','colour','Khaki Green','أخضر كاكي'),
  ('longchamp-official','colour','Sky Blue','أزرق سماوي'),
  ('longchamp-official','colour','Cream','كريمي'),
  ('loewe-official','bag_size','XL','كبير جدًا'),
  ('longchamp-official','size','XS','صغير جدًا'),
  ('longchamp-official','size','S','صغير'),
  ('longchamp-official','size','M','متوسط'),
  ('longchamp-official','size','L','كبير'),
  ('longchamp-official','bag_size','XS','صغير جدًا'),
  ('longchamp-official','bag_size','S','صغير'),
  ('longchamp-official','bag_size','M','متوسط'),
  ('longchamp-official','bag_size','L','كبير')
)
select u.product_id,u.model_key,u.is_primary,u."position",u.model_name,coalesce(localized.options,u.options),u.specs,u.rule,
  u.candidate_id,u.revision_hash,u.compared,u.basis
from unchanged u
left join lateral (
  select jsonb_agg(case when t.term_ar is null then o.option
    else jsonb_set(o.option-'value_lang','{value,ar}',to_jsonb(t.term_ar)) end order by o.position) options
  from jsonb_array_elements(u.options) with ordinality o(option,position)
  left join reviewed_options t on t.source_id=split_part(u.model_key,':',1)
    and t.kind=o.option->>'kind' and t.term_en=o.option->'value'->>'en' and o.option->>'value_lang'='en'
) localized on split_part(u.model_key,':',1) in ('loewe-official','longchamp-official')
), selected_families(model_key,signature) as (values
  ('rolex-official:size:1f00d7e99b58cff0','6fc969f34feb9bfaa8ec38efa6fa89c6'),
  ('rolex-official:size:325040bf2bc82d6a','7a78d4716253c921ed037ab4d6ec6331'),
  ('rolex-official:size:3ec037f08b15b14a','295df19efb4a0bcdea3600fd0ebfc1ad'),
  ('rolex-official:size:437dd26622cf4db3','b149efc8eefa162c0c8eb5fb59ace8b5'),
  ('rolex-official:size:55317e20e6d1b1bb','8092d49b179365e1b03939c9d903b19d'),
  ('rolex-official:size:61f218cc79eee034','49de2a1686ba145875a71beb2d34fef5'),
  ('rolex-official:size:7379eee395610a9d','b12e9296e0fe9fb873af4ec607776494'),
  ('rolex-official:size:76b6fa38935f07b7','3c890b4706e56b5d6fd4d4243759b7ef'),
  ('rolex-official:size:8c8012e5d45a544c','9d1c1363bf3dcc2cd189120c2924c576'),
  ('rolex-official:size:9682b0315b4bdc0b','6a3864bb851fe02c3e0da0e8f29166ad'),
  ('rolex-official:size:9e360582f5fecf7f','2cde9a42c734496c8bfd9dd7adff5261'),
  ('rolex-official:size:a9fe8588a2189c25','b443f6622748b5a1f123d0c39fa7bf7b'),
  ('rolex-official:size:c5d568bb0662dab5','f0dbd229741b6177d3ff175e4b631e65'),
  ('rolex-official:size:d41d44e48b200867','fcc5481cfac8464eccabfa8bae4de604'),
  ('rolex-official:size:f3227fc30379e33b','64259c35f6371e7bf1eb6886b7f25679')
), rolex as materialized (
  select d.*,p.reference,p.slug,p.name_ar,p.name_en,
    substring(p.reference from '^m([0-9a-z]+)-[0-9]{4}$') model_code,
    c.content->>'source_url' source_url,c.content->>'source_description' source_description
  from original d join public.jwl_catalog p on p.id=d.product_id
  join jwl_internal.candidates c on c.candidate_id=p.id and c.revision_hash=d.revision_hash
  left join jwl_internal.factual_publications f on f.catalog_id=p.id
  left join jwl_internal.published_revisions r on r.catalog_id=p.id
  where p.active and p.brand_slug='rolex' and c.source_id='rolex-official'
    and c.revision_hash in (f.revision_hash,r.revision_hash)
    and c.external_id=p.reference
    and c.content->>'source_url' ~ '^https://www[.]rolex[.]com/[^/]+/watches/[^/]+/m[0-9a-z]+-[0-9]{4}$'
    and regexp_replace(c.content->>'source_url','^.*/','')=p.reference
), observed_sizes as materialized (
  select r.model_key,r.model_code,min(z.option::text)::jsonb size_option,
    min((r.compared-'design'-'size')::text)::jsonb base_consistency,
    min(r.compared->>'design') design
  from rolex r join selected_families f using(model_key)
  cross join lateral jsonb_array_elements(r.options) z(option)
  where r.rule='rolex-size-family' and z.option->>'kind'='case_size'
  group by r.model_key,r.model_code
  having count(distinct z.option)=1 and count(distinct r.compared-'design'-'size')=1 and count(distinct r.compared->>'design')=1
), candidates as materialized (
  select r.*,s.model_key destination,s.size_option,s.design,r.model_key=s.model_key mapped,
    jsonb_build_array(to_jsonb(r),s.model_key,s.size_option,s.design) evidence
  from rolex r join observed_sizes s using(model_code)
  where r.model_key=s.model_key or (r.rule='single:ambiguous-options' and r.compared=s.base_consistency)
), family_pins as materialized (
  select c.destination,count(*) n,count(*) filter(where not c.mapped) held,
    min(c.product_id) filter(where c.mapped and c.is_primary) primary_id,
    md5(jsonb_agg(c.evidence order by c.reference collate "C")::text) signature
  from candidates c
  group by c.destination
  having count(*)=count(distinct c.product_id) and count(*) filter(where c.mapped and c.is_primary)=1
    and count(*) filter(where not c.mapped)>0
), validated as materialized (
  select c.*,p.primary_id,p.n,
    row_number() over(partition by c.destination order by c.mapped desc,case when c.mapped then c."position" end,c.reference collate "C")::int-1 new_position
  from candidates c join family_pins p using(destination)
  join selected_families s on s.model_key=p.destination and s.signature=p.signature
), rolex_attrs as materialized (
  select v.product_id,v.destination,j.spec,dim.ord,j.spec->>'kind' kind,j.spec->'value'->>'en' meaning
  from validated v cross join lateral jsonb_array_elements(v.specs) j(spec)
  join (values ('dial',1),('bracelet',2),('bracelet_material',3)) dim(kind,ord) on dim.kind=j.spec->>'kind'
), rolex_varying as (
  select destination,kind from rolex_attrs group by destination,kind having count(distinct meaning)>1
), kept_keys as (
  select v.destination,j.option->>'kind' kind,j.option->'value'->>'en' meaning,min(j.option->>'key') key
  from validated v cross join lateral jsonb_array_elements(v.options) j(option)
  where v.mapped group by 1,2,3
), rolex_options as (
  select a.product_id,jsonb_agg(a.spec||jsonb_build_object('key',coalesce(k.key,'source-'||md5(a.meaning))) order by a.ord) options
  from rolex_attrs a join rolex_varying w using(destination,kind) left join kept_keys k using(destination,kind,meaning)
  group by a.product_id
), replacement as materialized (
  select v.product_id,v.destination model_key,v.product_id=v.primary_id is_primary,v.new_position "position",p.model_name,
    jsonb_build_array(v.size_option)||coalesce(o.options,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'kind','reference','key',v.reference,'label',jsonb_build_object('ar','المرجع','en','Reference'),
      'value',jsonb_build_object('ar',v.reference,'en',v.reference),'value_lang','en')) options,
    v.specs,'rolex-size-family'::text rule,v.candidate_id,v.revision_hash,
    v.compared||jsonb_build_object('design',v.design,'size',v.size_option->'value'->>'en') compared,
    (case when v.mapped then v.basis else jsonb_build_object(
       'base',v.basis,'base_rule',v.rule,'base_model_key','rolex-official:'||v.model_code,
       'size_kind','case_size','family_sizes',p.basis->'family_sizes') end)
     ||jsonb_build_object('exact_reference_option',true,'reviewed_base_code',v.model_code,'family_variant_count',v.n) basis
  from validated v join validated p on p.product_id=v.primary_id
  left join rolex_options o on o.product_id=v.product_id
), proposed as (
  select * from replacement
  union all select o.* from original o where not exists(select 1 from replacement r where r.product_id=o.product_id)
)
select * from proposed
), reviewed_colour_specs(id,revision_hash,term_en,term_ar) as (values
  ('c20e6d52abe1c803bcefd105c3f682e3f95481f1dfa8ec1e1edab8a7ea37850d','28c29d400e09762846bdadefa1d375958fa0bca6c8c08be512267518d85f9098','Deep Navy','كحلي داكن'),
  ('163bd309655b6f7105fd2da56f0ca131cee8a91e04f4ecc339775fdf822ed293','c24cb5f5dbae3911239c5200eefa9160276d235d204b841db11398b5aa234cad','Deep Navy','كحلي داكن'),
  ('50935fd8056cace4281973a255d331a77a527b5ccffe3b62a4d0d3449b916bd3','8118a209da0364f973324dc3c7cb5f6fa8508c0cee990ef3d3e39ca04341f4d2','Dark Khaki','كاكي داكن'),
  ('b0b6005f1d8f6af3f6c52a0ed6869bc32da71f2dc84eb57ad35e6fcbf81c5b6e','62cecd6d4257c484f7b19440b0a5148d91d45193459ff82580eff89a228654cd','Deep Navy','كحلي داكن'),
  ('2843c6a9bf178130e4e8dfb24ba84b30c1bff928e39fc4d19476419d50eb2d73','7d0b36c72a790963e3aa5b3dc37f37cf7ef3443d2ff4a4943fee20dff8b4b828','Dark Burgundy','عنابي داكن'),
  ('c7506b00c9d44051f134b2215d3a8a90985c2ce796975fd5de5a5e91b83c2f38','9a8180d7e02c55100abfbee278b3dd6765f48d944ffc233fe3092ffcac858841','Dark Burgundy','عنابي داكن'),
  ('6067c6df6c84f5cd77d9af4bcf07cbe61c3773223a5b02c214b73e1f937bb812','7f8e930da2d898228286f28d532181d704f144f7c4572006d197e1cf2073bb24','Dark Khaki','كاكي داكن'),
  ('a66c2bfdae16f1a1c97a824c0dcb959da28694415337df79df65b77b20df74ad','c70471555f87900d899b134cf8d3d5a598167e593eb8557decdf64eaf2ca7722','Dark Burgundy','عنابي داكن'),
  ('ab00e5f21b12a651539fedc1e414a7969afc87376854f0eb6e1489ca37f58d39','ef2cb1e4098e397c7ec7c97cd8007e1e885fdbe6dab1e67c1fc8ae49d8849480','Dark Khaki','كاكي داكن'),
  ('08c068559c88d406227b227f9faa0c8d0b7a720adc3f521e647b814633767f67','a6c5f3ebfccaf01bcb3fcebf37f510d00431223d6eb8d99ab6e25ea2fc79a7b3','Dark Burgundy','عنابي داكن'),
  ('f79af2b739c9acc9f1b9f59ca74ac74514611357191b0a3c635656fb78d3b11e','1e8f09f9f1a24438ddc4807d1cafb6b8b32ab4d741960eb5cea210ad617e06c0','Deep Navy','كحلي داكن'),
  ('bfe99f090c7eb730ef2c4a34ab776a8523e4b92476c52b74e3d991bc4692e335','9dd3f26715190725f5b94400ff20f260c7b9e4fa749b3948d82d169fa3c8dbf5','Dark Khaki','كاكي داكن'),
  ('e670b2d5591a5e62c2d91bb9bc7d7e37d5bea28a0d7c67280a2d6d03af5f29a9','b8233c3ed9e1be7431f69714e880fad3e987fe16faa5a4686120f68fe7ef9743','Dark Burgundy','عنابي داكن'),
  ('3d61b503924cbda23d81d2170effdeb79571bda4946fc7725dca85509cd21e65','4600a086cc922866018e95937cd5b45152ad0162bd43f416d0f9cc30b944b331','Deep Navy','كحلي داكن'),
  ('d197f0a3b9ced2744ad3aa00880eccf85ede6899af0f598739844ceb16befc1d','20e7a4d7141cd3ddee759574dc18f8b9ecfbc62bef10886624441203c8f2da90','Dark Burgundy','عنابي داكن'),
  ('dffbf4a4b7d23bf1822878e4963d642c09e010b816f1ecc7245cf9329a69c4d9','2d4f60817412f65e277bbd0d65e9f4c867fd1011282d98cf4d0758a5f1769ea2','Deep Navy','كحلي داكن'),
  ('6f67333276e2b34c617ac9d93ecd762e33a6cc15995924333d2a2f77c349a655','a386d746e7f391e8649911b9daead9774583f294c9c42f094206cbd74307f5b5','Dark Burgundy','عنابي داكن'),
  ('f484b31d9a2e2c25e20ca7ce7e704b5fe58603eabed6699fa98199444c0e8f26','98b934eb4c16de96492ffc1f7c66df14521ac2369adce33f489e3c7e16543c1c','Light Blue','أزرق فاتح'),
  ('11100880ba5236181a341e43e2d13d388c616ffe8798c52d9432fbaa6f50a52b','5e38e3d65b777ff46f3a620ead9cb82396f92a05d4fc20523366b7debfa33941','Deep Navy','كحلي داكن'),
  ('23409af8834ebbd6e5a253f9d3220aee28d7c6498826f489386c159866181821','336323324088f275417d1b5ade26e1b261f100b268075a8124efd03906074df2','Deep Navy','كحلي داكن'),
  ('43fbc7fe7dab53a6852a45d3df99d6ac87909e9d46fd44f848b1437521f00907','59e24550d81564372321254d283093494adb91142de49e03d96b71b69885f193','Dark Burgundy','عنابي داكن'),
  ('97e339c4cf0018feeef3393d3beef650c60ee38621cab5955dc840c0bffe6a72','94b256cd6a69277044a9cca45e10f4b7381d3effa8c0e2dbd08296529dbca492','Dark Burgundy','عنابي داكن'),
  ('8c8843cdeb48e55fa2b0d1f71f3f9f513740c3343310f8b8fd291ec9310d2a21','5531fb9d4b884c6e1db09027f9a3f84c56685b4e25393535ff14558c3c6525bb','Dark Burgundy','عنابي داكن'),
  ('c97d70386e6cda3cb674adc33e7201e9871de4bea6ed88cbb2bac14549c349b3','c1a4d5e678f2efa8c1a099fa8c21db0a5c59ef3a61722880a80448db4b108951','Dark Burgundy','عنابي داكن'),
  ('e7d90586adb6878dbc2f94faacd3deb07c014a607863a0b4ad712b84be734958','a338739dcaa15116b379ab0d1cdb57b49da553a9f6a0e69469e01bb15a75618e','Khaki','كاكي'),
  ('ff9b170033e016669f73b9b981834428a9fcccccbc65887d3129e662b9600ba4','4d452d4359be296ce0f50b0d221ca7332088e7cda346e9f47a1c14091d3d34ba','Dark Grey','رمادي داكن'),
  ('b03f7e8979350f35a890e2a2ea49ba9aa84a5afa8f5d874665e9ea93f4b57331','1918386e87650c0a44c3a72098b87de55a0b4f7863dcf49349a7fe5508ed29da','Dark Grey','رمادي داكن'),
  ('72445bf8561543f87df86dabe5f4724c683c40b740594e0c45b5193e09dca39c','eaf7313e567eebe70673ea2257b99bb9d8ab6639ec8e2b6f241d2efa97abb0a6','Dark Khaki','كاكي داكن'),
  ('456feb4d69a23ef7c7a494fde45625e68a38c5101bedbefe7bd41fe539ffe464','6939c39ad99361ba643b16f6ffa5d713d325c00b072eb5f1b3b3679cc123e3eb','Dark Grey','رمادي داكن'),
  ('bb5efb6527ff710837ad5f2931e07425a84ab3e6e2fc1612df4899b553b2108e','fb6005f6e1d1221ec13b95a4531668150ccae8b958963add89e9890a50fae2e8','Dark Grey','رمادي داكن'),
  ('df416f41a7a7d8bbb15ff05806b792c6478c4d3485637b357b2256aace71b957','2e12b195482e3fe9dfedcf5bc1490aa48e4111ec7e42e694571a3e0f218d52ed','Dark Grey','رمادي داكن'),
  ('4d6a49cc741d3d5a8d17113023184dc36a995f6076c5faee5eab48c77a42c24e','f9470be53b92501ff2b52aa7ba444f4adef401325297af28b661de2511aec4fb','Dark Khaki','كاكي داكن'),
  ('9c21ae053a09f1646e5ea6d524b95c486df8dd74bf6f6a83fbffe318f9cc9fdc','bbd05c61a65c9b6bcd63aa413425575b02c98b533a5b968d738e2d312085b2da','Deep Navy','كحلي داكن'),
  ('43041ad9d866caca5ce76f421117317dcefa12919fe822a980971d03df795c5f','279454f3e18829aff36f59dbccb4a5bb246611f2323e297c165213c95795f3c2','Dark Grey','رمادي داكن'),
  ('1339b75153adf035bf490779dbaf480b2259660473cdafcd48644510c26bec0e','7c435f219c91ccaa956e8189756cba446a0aaccd6ff052ea2156e1bab7bc047e','Dark Khaki','كاكي داكن'),
  ('e544f5eacfb1275d1ad2b2b9e1be48657aab654f23791dbbc1b4f4947cebb1b4','6889592925ded85a01d83160c9ded2de36f8fde79c2ba3c5042ce9ca98830805','Deep Navy','كحلي داكن'),
  ('ea35dbfd87899f50478fd6d19e26c389e1c29a9609d7ea1a020b4d23bfb6dc2d','4744a3f7a2f31fb243200c3658c9b7854485a9883eab0e895d30f41f8f82a087','Dark Khaki','كاكي داكن'),
  ('33c20636f75f242bb6fcd0a41a495836984cd44ec9b2dcf84a1de5c964ef6465','cc080737d81e52a2fc2073dcbf057e76e01057df136f3025c4d9ea9d4f4eb6db','Light Khaki','كاكي فاتح'),
  ('6f161d027d3daef64415599be9d9d675e09048b66752b7088dadbe4559bfae35','86e72575c4104a14c1583ee437a91640a0583c2cce1d7867435c0e9ca3ae4fea','Dark Khaki','كاكي داكن'),
  ('24dbf3d159329a54dc58abd37378ebb9bd07cc7ede03923def9c3fbb99801c42','478aa98c33b7eeaed7e35d12e726d92ceb8702472e6f8f0b948780230b7254ce','Dark Grey','رمادي داكن'),
  ('9ade66bdf891e1402fe82dfcf3b5ccf5bdd7da495ca17444fa32adaab113c862','cec320d6c9f25f00fe3e781e1f1871b8f8f103472a5848877e36b92b8f9f8fb2','Blue Grey','أزرق رمادي'),
  ('466b8a9be5975fadc07ca09699d265ff18668dbdb001e4fe772afc26ef561012','da36f9240a949cceaa2d528d323c33d712b0f5cf29803af1581be7ed6f85ac1b','Dark Grey','رمادي داكن'),
  ('409ac2e15df874ea49d20b518497c3bc8d7ddfec929a9da86bab9a3ab8edc58a','19c5f265e37b90960a32240fcf12f0a23f0660894d33dddcee5fcf83cf8cd9d8','Dark Grey','رمادي داكن'),
  ('6d344c273efd0c0c373d83a3a2695334d3e8c2a245e2eddfca18fbc7084869cc','4508f2d15ba845e4cc5a12735cee5da6cf435fefad0c9ebb87ff46b327200761','Blue Grey','أزرق رمادي'),
  ('ffb98c8bdb6269c1b5def60988366360fc0f8db18a05f161086fbc596569262e','f524e2cdaf63878e8ca413a69ead71650d803a18f91769a14309b886104337fb','Dark Grey','رمادي داكن'),
  ('eae80b1091042d84fcddbdce96a2aaabe2786e3b80de818114ea75b9999af315','dab24ed2dad40166360115f5a0a0a475165d9aa171c8e3b290078fd2d4ff0c27','Dark Grey','رمادي داكن'),
  ('0ac0e193de78702684fe58a8886c62d00e0da3308599e2a6d42ab02b2c897a81','82a71a4f8f4659e3fe2e134ef8e3c854c3133f2a50d5c33efed67417b5f38add','Dark Khaki','كاكي داكن'),
  ('f79a991cce6971f208067a7b0ea658526a3979e0a34410d7c3387467674747da','72691744cbc594de05f9438ca81d2d389d9632d1d73a27601a60e92ac8ff5c23','Dark Grey','رمادي داكن'),
  ('1cd32d4bc524556b560bbcbc7179dd9383c875ae2c6c5d62da358ea3e4a2b185','ec02c8898b648f3264949226079becbbf6ea26b02cb589ba1427b4708228e249','Dark Grey','رمادي داكن'),
  ('f31e7ddd5cff15ffe4ab28454e899348142032f8c6d1581eaa287078bf1a0b9e','a6e93c81ede155e049548def82ecdc355c0c1f6c48413fc2527452ff1aa0742c','Khaki Green','أخضر كاكي'),
  ('4a78758ea39023a2f3205175b1c6a9ab1ca7e05af4a89c49a26805e3dfc6608f','40156e2c3268140095ac56ace7accfdc6ffaf068c6bfb557bc1069fd1d6378d6','Dark Burgundy','عنابي داكن'),
  ('f2c4155519a40eada51034b027e7e6fb6caff8888c041c62fddf4b7254e9c4d8','24edd704a509c8f9c5bee2019e3afcadc25cbcb1ef34e8d3ef31ec0bc3e9dbb4','Blue Grey','أزرق رمادي'),
  ('ada742ea1b4a16fd78a47d8ed36adca89bb7669ad134ffb3415b3298846e93ac','2c4e31be542d773231c2f0894e75ddf68278528d9955abe1caf567483516c5a5','Khaki Green','أخضر كاكي'),
  ('8cc3a9277cfbba53e9e8f5a6308eea294789b05f226444526456374523b9c371','fc21ab36b4007e0b1bcb1626cdc6c6fe3cb03f278e81c6ea3892beadd346de5d','Deep Navy','كحلي داكن'),
  ('086a846115bd9cf3c9a0eddc467a36cdb3a1649becc190f892c7a6bcaf03fa2b','9997aac25baae437712bb4acc6ab3a10f4da96603625d34514fdad318f0b8cf1','Dark Grey','رمادي داكن'),
  ('d5785e999d31164c724636c087dc954b97a8d7bfaa6f4da2cbeb7561c0e565b8','ddb282f38eec57b3421357494f5c8c4b7b627bca3663aeac4c7d16f484b152f2','Dark Khaki','كاكي داكن'),
  ('116a5a8367902262de25916f80d226bd34232b32a1ba86626959c0d9160609a1','de657c32fb64a8c30ad737888c8adac56e9b793df7741d63460d25bc15b0d563','Dark Grey','رمادي داكن'),
  ('46c1a0ee9d886fc4bbca2e254f532e349c9747e6e437f4d54bab903aa32f9541','3b227e0cdf042794cd55e4f60af979371f3c888070c05728cebb483229db59d5','Dark Khaki','كاكي داكن'),
  ('8752cdd02788933cae2a9ccaa6f1ae35db21db92dac3039e3723f2e925161e47','cbb57d277528799b4e5f636986d4079e122a0a8d387074fd6ab1232d30985201','Dark Grey','رمادي داكن'),
  ('3161eb80ab7388123d6716a303d5e21567f45c3aa9c228ef97b5625a85f0e4c5','37eb6ff5a11f9f17f2b1326741ed2d3d7ef5754f8bc1b7e38e1e22e16be1080a','Dark Khaki','كاكي داكن'),
  ('a0caad674dc33d2c841358c71451d390b7504f89e976659801ddbd6c089c041f','600a2a9ddb25f19fad6e3bc4306510d3c089ff9964db21748b908d847691a5bc','Khaki','كاكي'),
  ('5295151615c5d010d3794210b09d85ba9b5c8d38fded912652cc77293b1a9de9','b846665b6c87fbb5b15826d3f19aba4c7e14519c95225697df0702a68b001754','Khaki','كاكي'),
  ('16ce8028851e63af8009016e6a51558a54093b388779c0d6247110324d896ca0','00c170df65d98fd33be71a2af13ea3870b1ad4fc5672a8f233b3f6743cf117eb','Khaki','كاكي'),
  ('3b53c95a5289d3c32587a463ec2024a9fe76ec071bcd534f918135ec35f7a8b0','f67c0760c2b917378e545bb6b2ac8c57dc791a7c16a7ad30ff579d59abcae90f','Khaki','كاكي'),
  ('3c99aa9a57c65bb37f837d9f2f9ac730de0e9883911724ba73155c847cadf3aa','15edce5e0342c2ea4b49755bf663d9bed06b29c886512311a611741188bebbe2','Khaki','كاكي'),
  ('2bf40dc3f83df5581be5fe293bb073fcce1e1cf2079ff2999169958fd399422d','ea6209d9ed517c8053b217f15573775b6827aa352d18ddfda76de9b99f26e3cf','Cream','كريمي'),
  ('280616423a352a3bb034c07551d4675eed359b7a154f13afa1a2f6674f3e4d8f','238486cb5dc1938226d51ac374585b789ead9e71b3248b1f6f0ab948a50823dd','Cream','كريمي'),
  ('69c0ba4903881106998cf002f9d2e4152bb06b0f2d2ea2e84b33d0abb9911f55','ec612ea6386ba83caa0f20fec8fd6ddf11027632054d2658e467cd45207cac6b','Cream','كريمي'),
  ('20f07b2d4aa4e6fa5fd43c8a1ce8f1b0c8a04eaef80946cd31dde335ed2c37a5','a443b5cbdbed62ae7ed91d3e67d6dc3b3476d5369c77d82a494b8ae566d9c6f7','Khaki','كاكي'),
  ('c35c6024706d4667434819124028ccfd13c8b192d3c6b4f5e837ddf3a1b73c92','e302d05b67b1335776ffdb8113424b97ef1548fb372f60fe5f591a0b443d8f00','Khaki','كاكي'),
  ('0c77f6e843ddfa19e3c4b4b9d6ee76e9fffd00fb8d9cd0e37bfeea7321cd2e42','7767d70648d5d4f75469ec93726cb6eca565be28e4ef5828c3562d57b43f0a73','Sky Blue','أزرق سماوي'),
  ('28d62375112c0cc15a6da562708fd225a2ea2c54e92e6e02a03d95a2aea8ffbd','21c99ef388357b84f9320d0b22e354763ef6c6f83f2e353b4f2f7f6ffa5973a6','Sky Blue','أزرق سماوي'),
  ('780887ff6c878a27d7ee3a1186d63480eab8f424d560e7db7e81cdd9a3059a9e','f3f4b35794361fdb9b4cc6ff19f1cdb216af2b33afc226eeb56810151a231690','Khaki','كاكي'),
  ('ae476048c26619c55a289235ac898dd730e562915efb917fec5a292918c30faf','27dae42e248ee444798473d61ba6cace5fb6a1c59d6fa2cee27ad5217dfc7d0e','Khaki','كاكي'),
  ('7669ab2d49cb8ba56efc9a8ccf3644fc8b6b4ca109731a0ef4baf0a639679d13','492a4f45262c733855528704adea1aaea5be84d342aed44a1a020faa6de99a03','Khaki','كاكي'),
  ('6a220167aac31c0bb704481e8352e1b5edd6e9e37aba7d4b800868b089bf5c77','ec55881c282879731817ea50d3c1cd1dd8b291f1a0cae90d9bda5b85d0605c9b','Khaki','كاكي')
)
select u.product_id,u.model_key,u.is_primary,u."position",u.model_name,u.options,coalesce(localized.specs,u.specs),u.rule,
  u.candidate_id,u.revision_hash,u.compared,u.basis
from current_result u
left join reviewed_colour_specs t on t.id=u.product_id and t.revision_hash=u.revision_hash
  and split_part(u.model_key,':',1) in ('loewe-official','longchamp-official')
left join lateral (
  select jsonb_agg(case when s.spec->>'kind'='colour' and s.spec->>'value_lang'='en'
    and s.spec->'value'->>'en'=t.term_en and s.spec->'value'->>'ar'=t.term_en
    then jsonb_set(s.spec-'value_lang','{value,ar}',to_jsonb(t.term_ar)) else s.spec end order by s.position) specs
  from jsonb_array_elements(u.specs) with ordinality s(spec,position)
) localized on t.id is not null and (
  select count(*) from jsonb_array_elements(u.options) o
  where o->>'kind'='colour' and o->'value'->>'en'=t.term_en and o->'value'->>'ar'=t.term_ar
    and not (o?'value_lang')
)=1;
$function$;

create temporary table arabic_after on commit drop as select * from jwl_internal.derive_product_variants();

do $guard$
begin
  if exists (
    with delta as (
      select coalesce(b.product_id,a.product_id) id, md5(jsonb_build_array(b.model_key,b.is_primary,b."position",b.model_name,b.options,b.specs,b.rule)::text) old_signature, md5(jsonb_build_array(a.model_key,a.is_primary,a."position",a.model_name,a.options,a.specs,a.rule)::text) new_signature,
        (to_jsonb(b)-'specs') is not distinct from (to_jsonb(a)-'specs') protected_same
      from pg_temp.arabic_before b full join pg_temp.arabic_after a using(product_id)
      where to_jsonb(b) is distinct from to_jsonb(a)
    )
    select 1 from delta d full join pg_temp.arabic_expected e using(id)
    left join public.jwl_catalog p on p.id=e.id
    left join public.jwl_product_variants v on v.product_id=e.id
    left join jwl_internal.variant_evidence ve on ve.product_id=e.id
    left join pg_temp.arabic_before b on b.product_id=e.id
    where d.id is null or e.id is null or p.reference is distinct from e.ref or p.brand_slug is distinct from e.brand
      or b.revision_hash is distinct from e.revision or not d.protected_same
      or d.old_signature is distinct from e.old_signature or d.new_signature is distinct from e.new_signature
      or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.old_signature
      or (ve.model_key,ve.rule,ve.candidate_id,ve.revision_hash,ve.compared,ve.basis)
        is distinct from (b.model_key,b.rule,b.candidate_id,b.revision_hash,b.compared,b.basis)
  ) then raise exception 'Arabic colour specification derivation drifted from 76 reviewed rows'; end if;
end $guard$;

update public.jwl_product_variants v
set specs=a.specs
from pg_temp.arabic_expected e join pg_temp.arabic_after a on a.product_id=e.id
where v.product_id=e.id;

do $guard$
begin
  if exists (
    select 1 from pg_temp.arabic_expected e left join public.jwl_product_variants v on v.product_id=e.id
    where v.product_id is null or md5(jsonb_build_array(v.model_key,v.is_primary,v."position",v.model_name,v.options,v.specs,v.rule)::text) is distinct from e.new_signature
  ) then raise exception 'Arabic colour specifications differ after the update'; end if;
end $guard$;
commit;
